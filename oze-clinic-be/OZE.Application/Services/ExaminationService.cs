using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    public class ExaminationService : IExaminationService
    {
        private readonly IExaminationRepository _examinationRepository;
        private readonly IStaffRepository _staffRepository;

        public ExaminationService(IExaminationRepository examinationRepository, IStaffRepository staffRepository)
        {
            _examinationRepository = examinationRepository;
            _staffRepository = staffRepository;
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

        // The service and the variant the request names: both must exist and be active, the variant must belong to the service
        private async Task<(Service Service, ServiceVariant? Variant)> ResolveServiceAsync(SaveExaminationServiceRequest request, CancellationToken cancellationToken)
        {
            var service = await _examinationRepository.GetServiceAsync(request.ServiceId!.Value, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(service != null, ErrorConstants.AppointmentMessage.ServiceNotFound);
            ConditionGuard.Ensure(service!.IsActive, ErrorConstants.AppointmentMessage.ServiceInactive);

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
            Services = ToServiceResponses(examination, examination.Appointment.ServiceItems),
            Diagnoses = ToDiagnosisResponses(examination.Diagnoses)
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
