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
            return ToWorkResponse(examination);
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
            return ToWorkResponse(examination);
        }

        public async Task<List<ExaminationServiceResponse>> AddServiceAsync(string userId, long examinationId, AddExaminationServiceRequest request, CancellationToken cancellationToken = default)
        {
            var (_, examination) = await LoadAsync(userId, examinationId, cancellationToken);
            EnsureOpen(examination);

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

            var items = examination.Appointment.ServiceItems;
            ConditionGuard.Ensure(!items.Any(x => x.ServiceId == service.Id && x.VariantId == request.VariantId),
                ErrorConstants.ExaminationMessage.ServiceAlreadyAdded);

            // The same rule as booking: one appointment is done in one kind of room
            var roomTypes = items.Select(x => x.Service.RequiredRoomType)
                .Append(service.RequiredRoomType)
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .Distinct()
                .Count();
            ConditionGuard.Ensure(roomTypes <= 1, ErrorConstants.AppointmentMessage.ServicesNeedDifferentRooms);

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
