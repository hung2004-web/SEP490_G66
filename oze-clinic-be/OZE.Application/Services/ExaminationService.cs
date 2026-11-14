using Microsoft.Extensions.Logging;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    public class ExaminationService : IExaminationService
    {
        private readonly IExaminationRepository _examinationRepository;
        private readonly IStaffRepository _staffRepository;
        private readonly IAppointmentService _appointmentService;
        private readonly IAuditLogService _auditLogService;
        private readonly ISmsSender? _smsSender;
        private readonly IEmailSender? _emailSender;
        private readonly ILogger<ExaminationService>? _logger;

        public ExaminationService(
            IExaminationRepository examinationRepository,
            IStaffRepository staffRepository,
            IAppointmentService appointmentService,
            IAuditLogService auditLogService,
            ISmsSender? smsSender = null,
            IEmailSender? emailSender = null,
            ILogger<ExaminationService>? logger = null)
        {
            _examinationRepository = examinationRepository;
            _staffRepository = staffRepository;
            _appointmentService = appointmentService;
            _auditLogService = auditLogService;
            _smsSender = smsSender;
            _emailSender = emailSender;
            _logger = logger;
        }

        public async Task<ExaminationWorkResponse> GetAsync(string userId, long examinationId, CancellationToken cancellationToken = default)
        {
            var (_, examination) = await LoadAsync(userId, examinationId, cancellationToken);
            return await BuildWorkResponseAsync(examination, cancellationToken);
        }

        public async Task<ExaminationWorkResponse> UpdateContentAsync(string userId, long examinationId, UpdateExaminationContentRequest request, CancellationToken cancellationToken = default)
        {
            var (_, examination) = await LoadAsync(userId, examinationId, cancellationToken);
            EnsureOpen(examination);

            var complaint = Clean(request.ChiefComplaint);
            var notes = Clean(request.ClinicalNotes);
            ConditionGuard.Ensure(complaint == null || complaint.Length <= ExaminationConstants.ChiefComplaintMaxLength,
                ErrorConstants.ExaminationMessage.ChiefComplaintTooLong);
            ConditionGuard.Ensure(notes == null || notes.Length <= ExaminationConstants.ClinicalNotesMaxLength,
                ErrorConstants.ExaminationMessage.ClinicalNotesTooLong);

            examination.ChiefComplaint = complaint;
            examination.ClinicalNotes = notes;
            examination.UpdatedAt = DateTimeOffset.UtcNow;

            await _examinationRepository.SaveChangesAsync(cancellationToken);
            return await BuildWorkResponseAsync(examination, cancellationToken);
        }

        public async Task<List<ExaminationServiceResponse>> AddServiceAsync(string userId, long examinationId, SaveExaminationServiceRequest request, CancellationToken cancellationToken = default)
        {
            var (_, examination) = await LoadAsync(userId, examinationId, cancellationToken);
            EnsureOpen(examination);

            var (service, variant) = await ResolveServiceAsync(request, cancellationToken);
            var items = examination.Appointment.ServiceItems;
            EnsureServiceFits(items, service, variant, null);

            var slotMinutes = await GetSlotMinutesAsync();
            items.Add(new AppointmentServiceItem
            {
                AppointmentId = examination.AppointmentId,
                ServiceId = service.Id,
                VariantId = variant?.Id,
                Service = service,
                Variant = variant,
                // Copied now, so a later change of the catalog does not alter this appointment
                DurationMinutes = (variant?.EstimatedMinutes ?? service.EstimatedMinutes) ?? slotMinutes,
                PriceAtBooking = variant?.ReferencePrice ?? service.ReferencePrice,
                CreatedAt = DateTimeOffset.UtcNow
            });

            await _examinationRepository.SaveChangesAsync(cancellationToken);
            return ToServiceResponses(examination, items);
        }

        public async Task<List<ExaminationServiceResponse>> UpdateServiceAsync(string userId, long examinationId, long serviceItemId, SaveExaminationServiceRequest request, CancellationToken cancellationToken = default)
        {
            var (_, examination) = await LoadAsync(userId, examinationId, cancellationToken);
            EnsureOpen(examination);

            var items = examination.Appointment.ServiceItems;
            var item = items.FirstOrDefault(x => x.Id == serviceItemId);
            ConditionGuard.Ensure<NotFoundException>(item != null, ErrorConstants.ExaminationMessage.ServiceItemNotFound);

            var (service, variant) = await ResolveServiceAsync(request, cancellationToken);
            // Choosing what the line already is changes nothing
            if (item!.ServiceId == service.Id && item.VariantId == variant?.Id)
            {
                return ToServiceResponses(examination, items);
            }
            EnsureServiceFits(items, service, variant, item);

            var slotMinutes = await GetSlotMinutesAsync();
            item.ServiceId = service.Id;
            item.VariantId = variant?.Id;
            item.Service = service;
            item.Variant = variant;
            // The price and the time of the new choice are copied now. The line keeps its place and its "added by the doctor" mark.
            item.DurationMinutes = (variant?.EstimatedMinutes ?? service.EstimatedMinutes) ?? slotMinutes;
            item.PriceAtBooking = variant?.ReferencePrice ?? service.ReferencePrice;

            await _examinationRepository.SaveChangesAsync(cancellationToken);
            return ToServiceResponses(examination, items);
        }

        public async Task<List<ExaminationServiceResponse>> RemoveServiceAsync(string userId, long examinationId, long serviceItemId, CancellationToken cancellationToken = default)
        {
            var (_, examination) = await LoadAsync(userId, examinationId, cancellationToken);
            EnsureOpen(examination);

            var items = examination.Appointment.ServiceItems;
            var item = items.FirstOrDefault(x => x.Id == serviceItemId);
            ConditionGuard.Ensure<NotFoundException>(item != null, ErrorConstants.ExaminationMessage.ServiceItemNotFound);
            ConditionGuard.Ensure(items.Count > 1, ErrorConstants.ExaminationMessage.CannotRemoveLastService);

            _examinationRepository.RemoveServiceItem(item!);
            await _examinationRepository.SaveChangesAsync(cancellationToken);
            return ToServiceResponses(examination, items.Where(x => x.Id != item!.Id));
        }

        public async Task<List<DentalChartToothResponse>> GetDentalChartAsync(string userId, long examinationId, CancellationToken cancellationToken = default)
        {
            var (_, examination) = await LoadAsync(userId, examinationId, cancellationToken);
            return await BuildChartAsync(examination, cancellationToken);
        }

        public async Task<List<DentalChartToothResponse>> SetToothAsync(string userId, long examinationId, string toothNumber, SaveToothRequest request, CancellationToken cancellationToken = default)
        {
            var (_, examination) = await LoadAsync(userId, examinationId, cancellationToken);
            EnsureOpen(examination);

            var tooth = NormalizeTooth(toothNumber);
            var condition = DentalChartConstants.Conditions.FirstOrDefault(c => string.Equals(c, Clean(request.Condition), StringComparison.OrdinalIgnoreCase));
            ConditionGuard.Ensure(condition != null, ErrorConstants.ExaminationMessage.ToothConditionInvalid);
            var surface = Clean(request.Surface)?.ToUpperInvariant();
            var severity = Clean(request.Severity);
            var notes = Clean(request.Notes);
            ConditionGuard.Ensure(surface == null || surface.Length <= DentalChartConstants.SurfaceMaxLength, ErrorConstants.ExaminationMessage.ToothSurfaceTooLong);
            ConditionGuard.Ensure(severity == null || severity.Length <= DentalChartConstants.SeverityMaxLength, ErrorConstants.ExaminationMessage.ToothSeverityTooLong);
            ConditionGuard.Ensure(notes == null || notes.Length <= DentalChartConstants.NotesMaxLength, ErrorConstants.ExaminationMessage.ToothNotesTooLong);

            var earlier = await GetEarlierStateAsync(examination, cancellationToken);
            var before = earlier.TryGetValue(tooth, out var previous) ? previous.Condition : DentalChartConstants.Healthy;
            var existing = examination.DentalChartEntries.FirstOrDefault(x => x.ToothNumber == tooth);

            // Setting a tooth back to how it already was, with nothing to add, means there is no change to keep
            if (condition == before && surface == null && severity == null && notes == null)
            {
                if (existing != null) RemoveEntry(examination, existing);
            }
            else if (existing != null)
            {
                existing.Condition = condition!;
                existing.Surface = surface;
                existing.Severity = severity;
                existing.Notes = notes;
            }
            else
            {
                examination.DentalChartEntries.Add(new DentalChartEntry
                {
                    ExaminationId = examination.Id,
                    PatientId = examination.PatientId,
                    ToothNumber = tooth,
                    Condition = condition!,
                    Surface = surface,
                    Severity = severity,
                    Notes = notes,
                    CreatedAt = DateTimeOffset.UtcNow
                });
            }

            await _examinationRepository.SaveChangesAsync(cancellationToken);
            return await BuildChartAsync(examination, cancellationToken);
        }

        public async Task<List<DentalChartToothResponse>> RemoveToothChangeAsync(string userId, long examinationId, string toothNumber, CancellationToken cancellationToken = default)
        {
            var (_, examination) = await LoadAsync(userId, examinationId, cancellationToken);
            EnsureOpen(examination);

            var tooth = NormalizeTooth(toothNumber);
            var existing = examination.DentalChartEntries.FirstOrDefault(x => x.ToothNumber == tooth);
            ConditionGuard.Ensure<NotFoundException>(existing != null, ErrorConstants.ExaminationMessage.ToothNotRecorded);

            RemoveEntry(examination, existing!);
            await _examinationRepository.SaveChangesAsync(cancellationToken);
            return await BuildChartAsync(examination, cancellationToken);
        }

        public async Task<PrescriptionResponse> GetPrescriptionAsync(string userId, long examinationId, CancellationToken cancellationToken = default)
        {
            var (_, examination) = await LoadAsync(userId, examinationId, cancellationToken);
            return ToPrescriptionResponse(examination);
        }

        public async Task<PrescriptionResponse> SavePrescriptionNotesAsync(string userId, long examinationId, SavePrescriptionNotesRequest request, CancellationToken cancellationToken = default)
        {
            var (doctor, examination) = await LoadAsync(userId, examinationId, cancellationToken);
            EnsureOpen(examination);

            var notes = Clean(request.Notes);
            ConditionGuard.Ensure(notes == null || notes.Length <= PrescriptionConstants.NotesMaxLength, ErrorConstants.ExaminationMessage.PrescriptionNotesTooLong);
            var prescription = GetOrCreatePrescription(examination, doctor);
            EnsureDraft(prescription);

            prescription.Notes = notes;
            prescription.UpdatedAt = DateTimeOffset.UtcNow;
            await _examinationRepository.SaveChangesAsync(cancellationToken);
            return ToPrescriptionResponse(examination);
        }

        public async Task<PrescriptionResponse> AddPrescriptionItemAsync(string userId, long examinationId, SavePrescriptionItemRequest request, CancellationToken cancellationToken = default)
        {
            var (doctor, examination) = await LoadAsync(userId, examinationId, cancellationToken);
            EnsureOpen(examination);
            var item = ValidateMedication(request);
            var prescription = GetOrCreatePrescription(examination, doctor);
            EnsureDraft(prescription);

            item.SortOrder = prescription.Items.Count == 0 ? 1 : prescription.Items.Max(x => x.SortOrder) + 1;
            prescription.Items.Add(item);
            prescription.UpdatedAt = DateTimeOffset.UtcNow;

            await _examinationRepository.SaveChangesAsync(cancellationToken);
            return ToPrescriptionResponse(examination);
        }

        public async Task<PrescriptionResponse> UpdatePrescriptionItemAsync(string userId, long examinationId, long itemId, SavePrescriptionItemRequest request, CancellationToken cancellationToken = default)
        {
            var (doctor, examination) = await LoadAsync(userId, examinationId, cancellationToken);
            EnsureOpen(examination);
            var prescription = GetOrCreatePrescription(examination, doctor);
            EnsureDraft(prescription);

            var existing = prescription.Items.FirstOrDefault(x => x.Id == itemId);
            ConditionGuard.Ensure<NotFoundException>(existing != null, ErrorConstants.ExaminationMessage.PrescriptionItemNotFound);
            var changed = ValidateMedication(request);

            existing!.MedicationName = changed.MedicationName;
            existing.Dosage = changed.Dosage;
            existing.Frequency = changed.Frequency;
            existing.Duration = changed.Duration;
            existing.Quantity = changed.Quantity;
            existing.Instructions = changed.Instructions;
            prescription.UpdatedAt = DateTimeOffset.UtcNow;

            await _examinationRepository.SaveChangesAsync(cancellationToken);
            return ToPrescriptionResponse(examination);
        }

        public async Task<PrescriptionResponse> DeletePrescriptionItemAsync(string userId, long examinationId, long itemId, CancellationToken cancellationToken = default)
        {
            var (doctor, examination) = await LoadAsync(userId, examinationId, cancellationToken);
            EnsureOpen(examination);
            var prescription = GetOrCreatePrescription(examination, doctor);
            EnsureDraft(prescription);

            var existing = prescription.Items.FirstOrDefault(x => x.Id == itemId);
            ConditionGuard.Ensure<NotFoundException>(existing != null, ErrorConstants.ExaminationMessage.PrescriptionItemNotFound);

            _examinationRepository.RemovePrescriptionItem(existing!);
            prescription.Items.Remove(existing!);
            prescription.UpdatedAt = DateTimeOffset.UtcNow;

            await _examinationRepository.SaveChangesAsync(cancellationToken);
            return ToPrescriptionResponse(examination);
        }

        public async Task<PrescriptionResponse> DeletePrescriptionAsync(string userId, long examinationId, CancellationToken cancellationToken = default)
        {
            var (_, examination) = await LoadAsync(userId, examinationId, cancellationToken);
            EnsureOpen(examination);

            // Nothing to clear is not an error, the examination simply has no prescription
            var prescription = examination.Prescriptions.OrderBy(x => x.Id).FirstOrDefault();
            if (prescription != null)
            {
                EnsureDraft(prescription);
                _examinationRepository.RemovePrescription(prescription);
                examination.Prescriptions.Remove(prescription);
                await _examinationRepository.SaveChangesAsync(cancellationToken);
            }
            return ToPrescriptionResponse(examination);
        }

        public async Task<PrescriptionResponse> FinalizePrescriptionAsync(string userId, long examinationId, CancellationToken cancellationToken = default)
        {
            var (_, examination) = await LoadAsync(userId, examinationId, cancellationToken);
            EnsureOpen(examination);

            var prescription = examination.Prescriptions.OrderBy(x => x.Id).FirstOrDefault();
            ConditionGuard.Ensure(prescription != null && prescription.Items.Count > 0, ErrorConstants.ExaminationMessage.PrescriptionNothingToFinalize);

            // Finalizing twice is not an error, the prescription simply stays final
            if (prescription!.Status != PrescriptionConstants.Finalized)
            {
                prescription.Status = PrescriptionConstants.Finalized;
                prescription.UpdatedAt = DateTimeOffset.UtcNow;
                await _examinationRepository.SaveChangesAsync(cancellationToken);
            }
            return ToPrescriptionResponse(examination);
        }

        public async Task<PrescriptionResponse> ReopenPrescriptionAsync(string userId, long examinationId, CancellationToken cancellationToken = default)
        {
            var (_, examination) = await LoadAsync(userId, examinationId, cancellationToken);
            EnsureOpen(examination);

            var prescription = examination.Prescriptions.OrderBy(x => x.Id).FirstOrDefault();
            if (prescription != null && prescription.Status != PrescriptionConstants.Draft)
            {
                prescription.Status = PrescriptionConstants.Draft;
                prescription.UpdatedAt = DateTimeOffset.UtcNow;
                await _examinationRepository.SaveChangesAsync(cancellationToken);
            }
            return ToPrescriptionResponse(examination);
        }

        public async Task<List<DiagnosisResponse>> AddDiagnosisAsync(string userId, long examinationId, SaveDiagnosisRequest request, CancellationToken cancellationToken = default)
        {
            var (doctor, examination) = await LoadAsync(userId, examinationId, cancellationToken);
            EnsureOpen(examination);
            var (code, name, description) = ValidateDiagnosis(request);

            var diagnosis = new ClinicalDiagnosis
            {
                ExaminationId = examination.Id,
                DiagnosisCode = code,
                DiagnosisName = name,
                Description = description,
                DiagnosedByDoctorId = doctor.Id,
                CreatedAt = DateTimeOffset.UtcNow
            };
            // The first diagnosis is the primary one without being asked
            var makePrimary = request.IsPrimary || examination.Diagnoses.Count == 0;
            if (makePrimary)
            {
                foreach (var other in examination.Diagnoses) other.IsPrimary = false;
            }
            diagnosis.IsPrimary = makePrimary;
            examination.Diagnoses.Add(diagnosis);

            await _examinationRepository.SaveChangesAsync(cancellationToken);
            return ToDiagnosisResponses(examination.Diagnoses);
        }

        public async Task<List<DiagnosisResponse>> UpdateDiagnosisAsync(string userId, long examinationId, long diagnosisId, SaveDiagnosisRequest request, CancellationToken cancellationToken = default)
        {
            var (_, examination) = await LoadAsync(userId, examinationId, cancellationToken);
            EnsureOpen(examination);

            var diagnosis = examination.Diagnoses.FirstOrDefault(x => x.Id == diagnosisId);
            ConditionGuard.Ensure<NotFoundException>(diagnosis != null, ErrorConstants.ExaminationMessage.DiagnosisNotFound);
            var (code, name, description) = ValidateDiagnosis(request);

            diagnosis!.DiagnosisCode = code;
            diagnosis.DiagnosisName = name;
            diagnosis.Description = description;
            if (request.IsPrimary)
            {
                foreach (var other in examination.Diagnoses) other.IsPrimary = false;
            }
            diagnosis.IsPrimary = request.IsPrimary;
            EnsureOnePrimary(examination.Diagnoses);

            await _examinationRepository.SaveChangesAsync(cancellationToken);
            return ToDiagnosisResponses(examination.Diagnoses);
        }

        public async Task<List<DiagnosisResponse>> DeleteDiagnosisAsync(string userId, long examinationId, long diagnosisId, CancellationToken cancellationToken = default)
        {
            var (_, examination) = await LoadAsync(userId, examinationId, cancellationToken);
            EnsureOpen(examination);

            var diagnosis = examination.Diagnoses.FirstOrDefault(x => x.Id == diagnosisId);
            ConditionGuard.Ensure<NotFoundException>(diagnosis != null, ErrorConstants.ExaminationMessage.DiagnosisNotFound);

            _examinationRepository.RemoveDiagnosis(diagnosis!);
            var remaining = examination.Diagnoses.Where(x => x.Id != diagnosis!.Id).ToList();
            EnsureOnePrimary(remaining);

            await _examinationRepository.SaveChangesAsync(cancellationToken);
            return ToDiagnosisResponses(remaining);
        }

        public async Task<ExaminationWorkResponse> SetFollowUpAsync(
            string doctorUserId, long examinationId, SaveFollowUpRequest request, CancellationToken cancellationToken = default)
        {
            var (_, examination) = await LoadAsync(doctorUserId, examinationId, cancellationToken);
            // Allow setting follow-up during InProgress or once Completed; only locked records cannot be changed
            ConditionGuard.Ensure(examination.ExaminationStatus != ExaminationConstants.Locked, ErrorConstants.ExaminationMessage.AlreadyLocked);
            examination.UpdatedAt = DateTimeOffset.UtcNow;

            if (request.FollowUpDate.HasValue)
            {
                var today = DateOnly.FromDateTime(ClinicClock.Today);
                ConditionGuard.Ensure(request.FollowUpDate.Value > today, ErrorConstants.ExaminationMessage.FollowUpDateMustBeFuture);
            }
            else
            {
                var hasActiveFollowUp = examination.FollowUpAppointment != null
                    && examination.FollowUpAppointment.Status != AppointmentConstants.CancelledStatus
                    && examination.FollowUpAppointment.Status != AppointmentConstants.NoShowStatus;
                ConditionGuard.ThrowIf(hasActiveFollowUp, ErrorConstants.ExaminationMessage.FollowUpAppointmentAlreadyScheduled);
            }

            var notes = Clean(request.FollowUpNotes);
            ConditionGuard.Ensure(notes == null || notes.Length <= 500, ErrorConstants.ExaminationMessage.FollowUpNotesTooLong);

            var oldDate = examination.FollowUpDate;
            var oldNotes = examination.FollowUpNotes;

            examination.FollowUpDate = request.FollowUpDate;
            examination.FollowUpNotes = notes;
            // The doctor's own date replaces a periodic recall, and a new date reopens a follow-up the patient declined
            examination.FollowUpIsRecall = false;
            examination.FollowUpClosed = false;

            await _examinationRepository.SaveChangesAsync(cancellationToken);

            await _auditLogService.LogAsync(
                AuditConstants.ExaminationFollowUpSet,
                AuditConstants.ExaminationEntity,
                examination.Id.ToString(),
                oldValues: new { FollowUpDate = oldDate, FollowUpNotes = oldNotes },
                newValues: new { FollowUpDate = examination.FollowUpDate, FollowUpNotes = examination.FollowUpNotes });

            return await BuildWorkResponseAsync(examination, cancellationToken);
        }

        public async Task<AppointmentResponse> ScheduleFollowUpAppointmentAsync(
            string userId, long examinationId, ScheduleFollowUpRequest request, CancellationToken cancellationToken = default)
        {
            var examination = await _examinationRepository.GetByIdWithFollowUpAsync(examinationId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(examination != null, ErrorConstants.MedicalRecordMessage.ExaminationNotFound);

            var existingFollowUp = examination!.FollowUpAppointment;
            var hasActiveFollowUp = existingFollowUp != null
                ? (existingFollowUp.Status != AppointmentConstants.CancelledStatus
                   && existingFollowUp.Status != AppointmentConstants.NoShowStatus)
                : examination.FollowUpAppointmentId != null;
            ConditionGuard.ThrowIf(hasActiveFollowUp, ErrorConstants.ExaminationMessage.FollowUpAppointmentAlreadyScheduled);

            return await _appointmentService.ScheduleFollowUpAsync(examination.AppointmentId, request, userId, cancellationToken);
        }

        public async Task<PagedResult<FollowUpListItemResponse>> GetFollowUpsAsync(
            FollowUpQueryParameters query, string? doctorUserId, CancellationToken cancellationToken = default)
        {
            if (doctorUserId != null)
            {
                var doctor = await _staffRepository.GetByUserIdAsync(doctorUserId);
                if (doctor != null)
                {
                    query.DoctorId = doctor.Id;
                }
            }

            var paged = await _examinationRepository.GetFollowUpsAsync(query, cancellationToken);
            return paged.ToPagedResult(FollowUpMappingExtensions.ToFollowUpListItem);
        }

        public async Task<List<FollowUpListItemResponse>> GetMyFollowUpsAsync(string patientUserId, CancellationToken cancellationToken = default)
        {
            var patient = await _examinationRepository.GetPatientByUserIdAsync(patientUserId, cancellationToken);
            if (patient == null)
            {
                return new List<FollowUpListItemResponse>();
            }

            var exams = await _examinationRepository.GetPatientFollowUpsAsync(patient.Id, cancellationToken);
            return exams.Select(FollowUpMappingExtensions.ToFollowUpListItem).ToList();
        }

        public async Task<FollowUpListItemResponse> RemindFollowUpAsync(
            string userId, long examinationId, bool force = false, CancellationToken cancellationToken = default)
        {
            var examination = await _examinationRepository.GetByIdWithFollowUpAsync(examinationId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(examination != null, ErrorConstants.MedicalRecordMessage.ExaminationNotFound);

            var followUpDate = examination!.FollowUpDate ?? examination.FollowUpAppointment?.AppointmentDate;
            ConditionGuard.Ensure(followUpDate.HasValue, ErrorConstants.ExaminationMessage.FollowUpNotSet);

            var now = DateTimeOffset.UtcNow;
            if (!force && examination.FollowUpRemindedAt.HasValue && now - examination.FollowUpRemindedAt.Value < TimeSpan.FromHours(4))
            {
                throw new BadRequestException("Follow-up reminder has already been sent recently. Please wait before reminding again.");
            }

            examination.FollowUpRemindedAt = now;
            examination.FollowUpReminderCount += 1;
            examination.UpdatedAt = now;

            await SendFollowUpNotificationsAsync(examination, followUpDate!.Value, now, cancellationToken);

            await _examinationRepository.SaveChangesAsync(cancellationToken);

            await _auditLogService.LogAsync(
                AuditConstants.FollowUpReminded,
                AuditConstants.ExaminationEntity,
                examination.Id.ToString(),
                newValues: new
                {
                    examination.PatientId,
                    FollowUpDate = followUpDate,
                    ReminderCount = examination.FollowUpReminderCount,
                    RemindedAt = now,
                    TriggeredBy = userId
                });

            return examination.ToFollowUpListItem();
        }

        public async Task<BatchRemindFollowUpResponse> RemindDueFollowUpsAsync(
            DateOnly? targetDate = null,
            string? initiatedByUserId = null,
            CancellationToken cancellationToken = default)
        {
            var effectiveTargetDate = targetDate ?? DateOnly.FromDateTime(ClinicClock.Today.AddDays(1));
            var dueExaminations = await _examinationRepository.GetDueFollowUpsAsync(effectiveTargetDate, cancellationToken);

            var response = new BatchRemindFollowUpResponse
            {
                TargetDate = effectiveTargetDate,
                TotalTargeted = dueExaminations.Count
            };

            if (dueExaminations.Count == 0)
            {
                return response;
            }

            var now = DateTimeOffset.UtcNow;
            var successfulExams = new List<(Examination Exam, DateOnly FollowUpDate)>();
            var inAppNotifications = new List<Notification>();
            var syncLock = new object();

            // Tối ưu 1: Gửi SMS/Email song song có kiểm soát (MaxDegreeOfParallelism = 5)
            // Tách rời I/O mạng bên ngoài khỏi DbContext để bảo đảm thread-safety cho EF Core
            var parallelOptions = new ParallelOptions
            {
                MaxDegreeOfParallelism = Math.Min(5, Math.Max(1, Environment.ProcessorCount)),
                CancellationToken = cancellationToken
            };

            await Parallel.ForEachAsync(dueExaminations, parallelOptions, async (exam, ct) =>
            {
                try
                {
                    var followUpDate = exam.FollowUpDate ?? exam.FollowUpAppointment?.AppointmentDate ?? effectiveTargetDate;
                    var msg = BuildFollowUpMessage(exam, followUpDate);

                    // Gửi đồng thời SMS và Email cho bệnh nhân (non-blocking, parallel)
                    await SendExternalRemindersAsync(exam.Patient, msg, exam.Id);

                    Notification? inAppNotification = !string.IsNullOrEmpty(exam.Patient?.UserId)
                        ? CreateFollowUpInAppNotification(exam.Patient.UserId, msg, exam.Id, now)
                        : null;

                    lock (syncLock)
                    {
                        successfulExams.Add((exam, followUpDate));
                        if (inAppNotification != null)
                        {
                            inAppNotifications.Add(inAppNotification);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger?.LogError(ex, "Failed to send automatic reminder for examination {ExaminationId}", exam.Id);
                    lock (syncLock)
                    {
                        response.FailedCount++;
                    }
                }
            });

            // Tối ưu 2: Cập nhật Entity State & thêm InApp Notifications trên DbContext theo luồng an toàn
            foreach (var (exam, _) in successfulExams)
            {
                exam.FollowUpRemindedAt = now;
                exam.FollowUpReminderCount += 1;
                exam.UpdatedAt = now;
            }

            foreach (var notification in inAppNotifications)
            {
                await _examinationRepository.AddNotificationAsync(notification, cancellationToken);
            }

            // Tối ưu 3: Commit toàn bộ batch trong 1 round-trip duy nhất xuống Database (thay vì N lần SaveChanges)
            if (successfulExams.Count > 0)
            {
                try
                {
                    await _examinationRepository.SaveChangesAsync(cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger?.LogError(ex, "Failed to batch save examination follow-up reminders to database.");
                    throw;
                }
            }

            // Tối ưu 4: Ghi Audit Log và lập danh sách kết quả phản hồi
            foreach (var (exam, followUpDate) in successfulExams)
            {
                try
                {
                    await _auditLogService.LogAsync(
                        AuditConstants.FollowUpReminded,
                        AuditConstants.ExaminationEntity,
                        exam.Id.ToString(),
                        newValues: new
                        {
                            exam.PatientId,
                            FollowUpDate = followUpDate,
                            ReminderCount = exam.FollowUpReminderCount,
                            RemindedAt = now,
                            TriggeredBy = initiatedByUserId ?? "System_AutoWorker"
                        });
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "Failed to log audit entry for follow-up reminder on exam {ExaminationId}", exam.Id);
                }

                response.RemindedItems.Add(exam.ToFollowUpListItem());
                response.RemindedCount++;
            }

            return response;
        }

        private static string BuildFollowUpMessage(Examination exam, DateOnly followUpDate)
        {
            var followUpAppt = exam.FollowUpAppointment;
            var notes = string.IsNullOrWhiteSpace(exam.FollowUpNotes) ? string.Empty : $" Ghi chú: {exam.FollowUpNotes.Trim()}.";

            if (followUpAppt != null && followUpAppt.TimeSlotStart.HasValue)
            {
                var doctorName = followUpAppt.Doctor?.FullName ?? exam.Doctor?.FullName;
                var doctorText = !string.IsNullOrWhiteSpace(doctorName) ? $" với {doctorName}" : string.Empty;
                return $"Phòng khám OZE nhắc bạn có lịch hẹn tái khám vào lúc {followUpAppt.TimeSlotStart.Value:HH\\:mm} ngày {followUpAppt.AppointmentDate:dd/MM/yyyy}{doctorText}.{notes}";
            }

            return $"Phòng khám OZE nhắc bạn về lịch hẹn tái khám vào ngày {followUpDate:dd/MM/yyyy}.{notes} Vui lòng liên hệ phòng khám để xác nhận giờ hẹn khám phù hợp.";
        }

        private async Task SendExternalRemindersAsync(Patient? patient, string message, long examinationId)
        {
            var tasks = new List<Task>();

            if (_smsSender != null && !string.IsNullOrWhiteSpace(patient?.PhoneNumber))
            {
                tasks.Add(SendSmsSafeAsync(patient.PhoneNumber, message, examinationId));
            }

            if (_emailSender != null && !string.IsNullOrWhiteSpace(patient?.Email))
            {
                tasks.Add(SendEmailSafeAsync(patient.Email, message, examinationId));
            }

            if (tasks.Count > 0)
            {
                await Task.WhenAll(tasks);
            }
        }

        private async Task SendSmsSafeAsync(string phoneNumber, string message, long examinationId)
        {
            try
            {
                await _smsSender!.SendSmsAsync(phoneNumber, message);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Could not send SMS follow-up reminder for examination {ExaminationId} to {Phone}", examinationId, phoneNumber);
            }
        }

        private async Task SendEmailSafeAsync(string email, string message, long examinationId)
        {
            try
            {
                await _emailSender!.SendEmailAsync(email, "Phòng khám OZE - Nhắc lịch tái khám", message);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Could not send Email follow-up reminder for examination {ExaminationId} to {Email}", examinationId, email);
            }
        }

        private async Task SendFollowUpNotificationsAsync(
            Examination examination, DateOnly followUpDate, DateTimeOffset now, CancellationToken cancellationToken)
        {
            var msg = BuildFollowUpMessage(examination, followUpDate);

            // 1. In-App Notification (cho bệnh nhân có tài khoản)
            if (!string.IsNullOrEmpty(examination.Patient?.UserId))
            {
                var notification = CreateFollowUpInAppNotification(examination.Patient.UserId, msg, examination.Id, now);
                await _examinationRepository.AddNotificationAsync(notification, cancellationToken);
            }

            // 2 & 3. SMS & Email chạy đồng thời (non-blocking song song)
            await SendExternalRemindersAsync(examination.Patient, msg, examination.Id);
        }

        private static Notification CreateFollowUpInAppNotification(string userId, string message, long examinationId, DateTimeOffset createdAt) =>
            new()
            {
                UserId = userId,
                Title = "Nhắc lịch tái khám",
                Message = message,
                NotificationType = "InApp",
                Channel = "InApp",
                ReferenceType = "Examination",
                ReferenceId = examinationId.ToString(),
                DeliveryStatus = "Sent",
                CreatedAt = createdAt
            };

        // The service and the variant the request names: both must exist and be active, the variant must belong to the service
        private async Task<(Service Service, ServiceVariant? Variant)> ResolveServiceAsync(SaveExaminationServiceRequest request, CancellationToken cancellationToken)
        {
            var service = await _examinationRepository.GetServiceAsync(request.ServiceId!.Value, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(service != null, ErrorConstants.AppointmentMessage.ServiceNotFound);
            ConditionGuard.Ensure(service!.IsActive, ErrorConstants.AppointmentMessage.ServiceInactive);

            // A service that has active variants is added through one of them, never on its own
            ConditionGuard.Ensure(request.VariantId.HasValue || !service.Variants.Any(v => v.IsActive),
                string.Format(ErrorConstants.AppointmentMessage.VariantRequired, service.ServiceName));

            ServiceVariant? variant = null;
            if (request.VariantId.HasValue)
            {
                variant = await _examinationRepository.GetVariantAsync(request.VariantId.Value, cancellationToken);
                ConditionGuard.Ensure<NotFoundException>(variant != null, ErrorConstants.AppointmentMessage.VariantNotFound);
                ConditionGuard.Ensure(variant!.ServiceId == service.Id, ErrorConstants.ExaminationMessage.VariantMismatch);
                ConditionGuard.Ensure(variant.IsActive, ErrorConstants.AppointmentMessage.VariantInactive);
            }
            return (service, variant);
        }

        // Checked against the other lines of the appointment (the one being changed is left out)
        private static void EnsureServiceFits(IEnumerable<AppointmentServiceItem> items, Service service, ServiceVariant? variant, AppointmentServiceItem? changing)
        {
            var others = items.Where(x => x != changing).ToList();
            ConditionGuard.Ensure(!others.Any(x => x.ServiceId == service.Id && x.VariantId == variant?.Id),
                ErrorConstants.ExaminationMessage.ServiceAlreadyAdded);

            // The same rule as booking: one appointment is done in one kind of room
            var roomTypes = others.Select(x => x.Service.RequiredRoomType)
                .Append(service.RequiredRoomType)
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .Distinct()
                .Count();
            ConditionGuard.Ensure(roomTypes <= 1, ErrorConstants.AppointmentMessage.ServicesNeedDifferentRooms);
        }

        // An examination has one prescription, created when the first medication or note is saved
        private static Prescription GetOrCreatePrescription(Examination examination, StaffProfile doctor)
        {
            var prescription = examination.Prescriptions.OrderBy(x => x.Id).FirstOrDefault();
            if (prescription != null) return prescription;

            prescription = new Prescription
            {
                ExaminationId = examination.Id,
                PatientId = examination.PatientId,
                PrescribedByDoctorId = doctor.Id,
                Status = PrescriptionConstants.Draft,
                CreatedAt = DateTimeOffset.UtcNow
            };
            examination.Prescriptions.Add(prescription);
            return prescription;
        }

        private static void EnsureDraft(Prescription prescription)
        {
            ConditionGuard.Ensure(prescription.Status == PrescriptionConstants.Draft, ErrorConstants.ExaminationMessage.PrescriptionFinalized);
        }

        private static PrescriptionItem ValidateMedication(SavePrescriptionItemRequest request)
        {
            var name = Clean(request.MedicationName);
            ConditionGuard.Ensure(name != null, ErrorConstants.ExaminationMessage.MedicationNameRequired);
            ConditionGuard.Ensure(name!.Length <= PrescriptionConstants.MedicationNameMaxLength, ErrorConstants.ExaminationMessage.MedicationNameTooLong);

            var dosage = Clean(request.Dosage);
            var frequency = Clean(request.Frequency);
            var duration = Clean(request.Duration);
            var instructions = Clean(request.Instructions);
            ConditionGuard.Ensure(dosage == null || dosage.Length <= PrescriptionConstants.DosageMaxLength, ErrorConstants.ExaminationMessage.DosageTooLong);
            ConditionGuard.Ensure(frequency == null || frequency.Length <= PrescriptionConstants.FrequencyMaxLength, ErrorConstants.ExaminationMessage.FrequencyTooLong);
            ConditionGuard.Ensure(duration == null || duration.Length <= PrescriptionConstants.DurationMaxLength, ErrorConstants.ExaminationMessage.DurationTooLong);
            ConditionGuard.Ensure(instructions == null || instructions.Length <= PrescriptionConstants.InstructionsMaxLength, ErrorConstants.ExaminationMessage.InstructionsTooLong);
            ConditionGuard.Ensure(request.Quantity == null || (request.Quantity >= 1 && request.Quantity <= PrescriptionConstants.MaxQuantity), ErrorConstants.ExaminationMessage.QuantityInvalid);

            return new PrescriptionItem
            {
                MedicationName = name,
                Dosage = dosage,
                Frequency = frequency,
                Duration = duration,
                Quantity = request.Quantity,
                Instructions = instructions
            };
        }

        // No prescription yet shows as an empty draft with id 0
        private static PrescriptionResponse ToPrescriptionResponse(Examination examination)
        {
            var prescription = examination.Prescriptions.OrderBy(x => x.Id).FirstOrDefault();
            if (prescription == null) return new PrescriptionResponse { Id = 0, Status = PrescriptionConstants.Draft };

            return new PrescriptionResponse
            {
                Id = prescription.Id,
                Status = prescription.Status,
                Notes = prescription.Notes,
                Items = prescription.Items.OrderBy(x => x.SortOrder).ThenBy(x => x.Id).Select(x => new PrescriptionItemResponse
                {
                    Id = x.Id,
                    MedicationName = x.MedicationName,
                    Dosage = x.Dosage,
                    Frequency = x.Frequency,
                    Duration = x.Duration,
                    Quantity = x.Quantity,
                    Instructions = x.Instructions
                }).ToList()
            };
        }

        private void RemoveEntry(Examination examination, DentalChartEntry entry)
        {
            _examinationRepository.RemoveChartEntry(entry);
            examination.DentalChartEntries.Remove(entry);
        }

        // FDI number: quadrant 1-4 has teeth 1-8, quadrant 5-8 (baby teeth) has teeth 1-5
        private static string NormalizeTooth(string? toothNumber)
        {
            var value = Clean(toothNumber);
            var valid = value != null && value.Length == 2 && char.IsDigit(value[0]) && char.IsDigit(value[1]);
            if (valid)
            {
                var quadrant = value![0] - '0';
                var index = value[1] - '0';
                valid = (quadrant >= 1 && quadrant <= DentalChartConstants.LastPermanentQuadrant && index >= 1 && index <= DentalChartConstants.PermanentTeethPerQuadrant)
                    || (quadrant > DentalChartConstants.LastPermanentQuadrant && quadrant <= DentalChartConstants.LastBabyToothQuadrant && index >= 1 && index <= DentalChartConstants.BabyTeethPerQuadrant);
            }
            ConditionGuard.Ensure(valid, ErrorConstants.ExaminationMessage.ToothNumberInvalid);
            return value!;
        }

        // The latest entry of each tooth from the patient's earlier examinations
        private async Task<Dictionary<string, DentalChartEntry>> GetEarlierStateAsync(Examination examination, CancellationToken cancellationToken)
        {
            var earlier = await _examinationRepository.GetEarlierChartEntriesAsync(examination.PatientId, examination.CreatedAt, examination.Id, cancellationToken);
            return earlier.GroupBy(x => x.ToothNumber)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id).First());
        }

        // The chart at the end of this examination: the earlier state of every tooth, with this examination's changes on top.
        // Healthy teeth are left out unless this examination set them back to healthy.
        private async Task<List<DentalChartToothResponse>> BuildChartAsync(Examination examination, CancellationToken cancellationToken)
        {
            var state = (await GetEarlierStateAsync(examination, cancellationToken))
                .ToDictionary(x => x.Key, x => (Entry: x.Value, Here: false));
            foreach (var own in examination.DentalChartEntries.GroupBy(x => x.ToothNumber))
            {
                state[own.Key] = (own.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id).First(), true);
            }

            return state
                .Where(x => x.Value.Here || x.Value.Entry.Condition != DentalChartConstants.Healthy)
                .OrderBy(x => x.Key, StringComparer.Ordinal)
                .Select(x => new DentalChartToothResponse
                {
                    ToothNumber = x.Key,
                    Condition = x.Value.Entry.Condition,
                    Surface = x.Value.Entry.Surface,
                    Severity = x.Value.Entry.Severity,
                    Notes = x.Value.Entry.Notes,
                    RecordedInThisExamination = x.Value.Here
                }).ToList();
        }

        private async Task<ExaminationWorkResponse> BuildWorkResponseAsync(Examination examination, CancellationToken cancellationToken)
        {
            var response = ToWorkResponse(examination);
            response.DentalChart = await BuildChartAsync(examination, cancellationToken);
            return response;
        }

        // The doctor of the examination only. Reading is allowed even when it is locked, writing is not (EnsureOpen).
        private async Task<(StaffProfile Doctor, Examination Examination)> LoadAsync(string userId, long examinationId, CancellationToken cancellationToken)
        {
            var doctor = await _staffRepository.GetByUserIdAsync(userId);
            ConditionGuard.Ensure<NotFoundException>(doctor != null, ErrorConstants.MedicalRecordMessage.DoctorNotFound);

            var examination = await _examinationRepository.GetForWorkAsync(examinationId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(examination != null, ErrorConstants.MedicalRecordMessage.ExaminationNotFound);
            ConditionGuard.Ensure<ForbiddenException>(examination!.DoctorId == doctor!.Id, ErrorConstants.ExaminationMessage.NotExaminingDoctor);

            return (doctor, examination);
        }

        private static void EnsureOpen(Examination examination)
        {
            ConditionGuard.Ensure(examination.ExaminationStatus == ExaminationConstants.InProgress, ErrorConstants.ExaminationMessage.AlreadyLocked);
            // Every change also saves the examination row, so its row version is checked: a change racing with
            // "complete" (or another change) fails with 409 instead of landing on a locked examination
            examination.UpdatedAt = DateTimeOffset.UtcNow;
        }

        private async Task<int> GetSlotMinutesAsync()
        {
            var value = await _examinationRepository.GetConfigValueAsync(ConfigKeyConstants.SlotDurationMinutes);
            ConditionGuard.Ensure(int.TryParse(value, out var minutes),
                string.Format(ErrorConstants.AppointmentMessage.ConfigMissing, ConfigKeyConstants.SlotDurationMinutes));
            return minutes;
        }

        private static string? Clean(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();

        private static (string? Code, string Name, string? Description) ValidateDiagnosis(SaveDiagnosisRequest request)
        {
            var name = Clean(request.DiagnosisName);
            ConditionGuard.Ensure(name != null, ErrorConstants.ExaminationMessage.DiagnosisNameRequired);
            ConditionGuard.Ensure(name!.Length <= ExaminationConstants.DiagnosisNameMaxLength, ErrorConstants.ExaminationMessage.DiagnosisNameTooLong);

            var code = Clean(request.DiagnosisCode)?.ToUpperInvariant();
            ConditionGuard.Ensure(code == null || code.Length <= ExaminationConstants.DiagnosisCodeMaxLength, ErrorConstants.ExaminationMessage.DiagnosisCodeTooLong);

            var description = Clean(request.Description);
            ConditionGuard.Ensure(description == null || description.Length <= ExaminationConstants.DiagnosisDescriptionMaxLength,
                ErrorConstants.ExaminationMessage.DiagnosisDescriptionTooLong);

            return (code, name, description);
        }

        // An examination with diagnoses always has exactly one primary: if none is left, the earliest one takes over
        private static void EnsureOnePrimary(IEnumerable<ClinicalDiagnosis> diagnoses)
        {
            var list = diagnoses.ToList();
            if (list.Count > 0 && !list.Any(x => x.IsPrimary))
            {
                list.OrderBy(x => x.CreatedAt).ThenBy(x => x.Id).First().IsPrimary = true;
            }
        }

        private static ExaminationWorkResponse ToWorkResponse(Examination examination) => new()
        {
            ExaminationId = examination.Id,
            AppointmentId = examination.AppointmentId,
            PatientId = examination.PatientId,
            ExaminationStatus = examination.ExaminationStatus,
            ChiefComplaint = examination.ChiefComplaint,
            ClinicalNotes = examination.ClinicalNotes,
            FollowUpDate = examination.FollowUpDate,
            FollowUpNotes = examination.FollowUpNotes,
            FollowUpAppointmentId = examination.FollowUpAppointmentId,
            FollowUp = examination.ToFollowUpSummary(),
            Services = ToServiceResponses(examination, examination.Appointment.ServiceItems),
            Diagnoses = ToDiagnosisResponses(examination.Diagnoses),
            Prescription = ToPrescriptionResponse(examination)
        };

        private static List<ExaminationServiceResponse> ToServiceResponses(Examination examination, IEnumerable<AppointmentServiceItem> items) =>
            items.OrderBy(x => x.CreatedAt).ThenBy(x => x.Id).Select(x => new ExaminationServiceResponse
            {
                Id = x.Id,
                ServiceId = x.ServiceId,
                VariantId = x.VariantId,
                ServiceName = x.Service.ServiceName,
                VariantName = x.Variant?.VariantName,
                Price = x.PriceAtBooking,
                DurationMinutes = x.DurationMinutes,
                // A service created after the examination started was added by the doctor
                AddedDuringExamination = x.CreatedAt >= examination.CreatedAt
            }).ToList();

        private static List<DiagnosisResponse> ToDiagnosisResponses(IEnumerable<ClinicalDiagnosis> diagnoses) =>
            diagnoses.OrderBy(x => x.CreatedAt).ThenBy(x => x.Id).Select(x => new DiagnosisResponse
            {
                Id = x.Id,
                DiagnosisCode = x.DiagnosisCode,
                DiagnosisName = x.DiagnosisName,
                Description = x.Description,
                IsPrimary = x.IsPrimary
            }).ToList();
    }
}
