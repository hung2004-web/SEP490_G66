using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    public class ImagingRequestService : IImagingRequestService
    {
        private readonly IImagingRequestRepository _imagingRequestRepository;
        private readonly IStaffRepository _staffRepository;
        private readonly IAppointmentRepository? _appointmentRepository;
        private readonly IQueueService? _queueService;

        public ImagingRequestService(
            IImagingRequestRepository imagingRequestRepository,
            IStaffRepository staffRepository,
            IAppointmentRepository? appointmentRepository = null,
            IQueueService? queueService = null)
        {
            _imagingRequestRepository = imagingRequestRepository;
            _staffRepository = staffRepository;
            _appointmentRepository = appointmentRepository;
            _queueService = queueService;
        }

        public async Task<ImagingRequestResponse> CreateAsync(
            string userId,
            long examinationId,
            CreateImagingRequest request,
            CancellationToken cancellationToken = default)
        {
            var doctor = await _staffRepository.GetByUserIdAsync(userId);
            ConditionGuard.Ensure<NotFoundException>(doctor != null, ErrorConstants.MedicalRecordMessage.DoctorNotFound);

            var examination = await _imagingRequestRepository.GetExaminationAsync(examinationId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(examination != null, ErrorConstants.MedicalRecordMessage.ExaminationNotFound);

            ConditionGuard.Ensure<ForbiddenException>(
                examination!.DoctorId == doctor!.Id,
                ErrorConstants.ImagingRequestMessage.NotExaminingDoctor);

            ConditionGuard.Ensure(
                examination.ExaminationStatus == ImagingRequestConstants.InProgressExaminationStatus,
                string.Format(ErrorConstants.ImagingRequestMessage.ExaminationNotInProgress, examination.ExaminationStatus));

            var imagingType = RequireValue(request.ImagingType, ErrorConstants.ImagingRequestMessage.ImagingTypeRequired);
            var targetArea = RequireValue(request.TargetArea, ErrorConstants.ImagingRequestMessage.TargetAreaRequired);
            var clinicalIndication = RequireValue(request.ClinicalIndication, ErrorConstants.ImagingRequestMessage.ClinicalIndicationRequired);

            var canonicalType = ImagingRequestConstants.ImagingTypes
                .FirstOrDefault(type => string.Equals(type, imagingType, StringComparison.OrdinalIgnoreCase));
            ConditionGuard.Ensure(canonicalType != null, ErrorConstants.ImagingRequestMessage.ImagingTypeInvalid);
            ConditionGuard.Ensure(targetArea.Length <= ImagingRequestConstants.TargetAreaMaxLength, ErrorConstants.ImagingRequestMessage.TargetAreaInvalid);
            ConditionGuard.Ensure(
                clinicalIndication.Length <= ImagingRequestConstants.ClinicalIndicationMaxLength,
                ErrorConstants.ImagingRequestMessage.ClinicalIndicationInvalid);

            var now = DateTimeOffset.UtcNow;
            var imagingRequest = new ImagingRequest
            {
                ExaminationId = examination.Id,
                RequestedByDoctorId = doctor.Id,
                ImagingType = canonicalType!,
                TargetArea = targetArea,
                ClinicalIndication = clinicalIndication,
                RequestStatus = ImagingRequestConstants.Pending,
                CreatedAt = now
            };

            var patientName = string.IsNullOrWhiteSpace(examination.Patient?.FullName)
                ? "the patient"
                : examination.Patient!.FullName.Trim();
            var technicianUserIds = await _imagingRequestRepository.GetActiveTechnicianUserIdsAsync(cancellationToken);

            await _imagingRequestRepository.AddAsync(
                imagingRequest,
                technicianUserIds,
                ErrorConstants.ImagingRequestMessage.TechnicianNotificationTitle,
                string.Format(ErrorConstants.ImagingRequestMessage.TechnicianNotificationMessage, canonicalType, patientName),
                cancellationToken);

            // Unblock doctor so doctor can examine other waiting patients while this patient goes to the imaging room
            if (examination.Appointment != null)
            {
                examination.Appointment.Status = AppointmentConstants.CheckedInStatus;
                examination.Appointment.UpdatedAt = now;
                if (_appointmentRepository != null)
                {
                    await _appointmentRepository.UpdateAsync(examination.Appointment);
                }
            }

            if (_queueService != null && examination.Appointment != null)
            {
                await _queueService.UpdateStatusAsync(examination.AppointmentId, "Examination", "WAITING", cancellationToken);
                await _queueService.EnqueueAsync(
                    examination.AppointmentId,
                    "Imaging",
                    null,
                    null,
                    1,
                    $"Imaging: {canonicalType} - {targetArea}",
                    cancellationToken);
            }

            return ToResponse(imagingRequest, examination.PatientId);
        }

        public async Task<List<ImagingRequestResponse>> GetByExaminationAsync(
            string userId,
            long examinationId,
            CancellationToken cancellationToken = default)
        {
            var doctor = await _staffRepository.GetByUserIdAsync(userId);
            ConditionGuard.Ensure<NotFoundException>(doctor != null, ErrorConstants.MedicalRecordMessage.DoctorNotFound);

            var examination = await _imagingRequestRepository.GetExaminationAsync(examinationId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(examination != null, ErrorConstants.MedicalRecordMessage.ExaminationNotFound);

            ConditionGuard.Ensure<ForbiddenException>(
                examination!.DoctorId == doctor!.Id,
                ErrorConstants.ImagingRequestMessage.CannotViewRequests);

            var requests = await _imagingRequestRepository.GetByExaminationIdAsync(examinationId, cancellationToken);
            return requests
                .OrderBy(request => request.CreatedAt)
                .ThenBy(request => request.Id)
                .Select(request => ToResponse(request, examination.PatientId))
                .ToList();
        }

        public async Task<ImagingRequestResponse> GetByIdAsync(
            string userId,
            long id,
            CancellationToken cancellationToken = default)
        {
            var doctor = await _staffRepository.GetByUserIdAsync(userId);
            ConditionGuard.Ensure<NotFoundException>(doctor != null, ErrorConstants.MedicalRecordMessage.DoctorNotFound);

            var imagingRequest = await _imagingRequestRepository.GetByIdAsync(id, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(imagingRequest != null, ErrorConstants.ImagingRequestMessage.RequestNotFound);
            var found = imagingRequest!;

            ConditionGuard.Ensure<ForbiddenException>(
                found.RequestedByDoctorId == doctor!.Id,
                ErrorConstants.ImagingRequestMessage.CannotViewRequest);
            var examination = found.Examination;
            if (examination == null)
            {
                throw new NotFoundException(ErrorConstants.MedicalRecordMessage.ExaminationNotFound);
            }

            return ToResponse(found, examination.PatientId);
        }

        public async Task<ImagingRequestResponse> CancelAsync(
            string userId,
            long id,
            CancelImagingRequest request,
            CancellationToken cancellationToken = default)
        {
            var doctor = await _staffRepository.GetByUserIdAsync(userId);
            ConditionGuard.Ensure<NotFoundException>(doctor != null, ErrorConstants.MedicalRecordMessage.DoctorNotFound);

            var imagingRequest = await _imagingRequestRepository.GetTrackedByIdAsync(id, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(imagingRequest != null, ErrorConstants.ImagingRequestMessage.RequestNotFound);
            var found = imagingRequest!;

            ConditionGuard.Ensure<ForbiddenException>(
                found.RequestedByDoctorId == doctor!.Id,
                ErrorConstants.ImagingRequestMessage.CannotCancelRequest);
            ConditionGuard.Ensure(
                found.RequestStatus == ImagingRequestConstants.Pending,
                string.Format(ErrorConstants.ImagingRequestMessage.RequestNotPending, found.RequestStatus));

            var cancelReason = RequireValue(request.CancelReason, ErrorConstants.ImagingRequestMessage.CancelReasonRequired);
            ConditionGuard.Ensure(
                cancelReason.Length <= ImagingRequestConstants.CancelReasonMaxLength,
                ErrorConstants.ImagingRequestMessage.CancelReasonInvalid);

            var examination = found.Examination;
            if (examination == null)
            {
                throw new NotFoundException(ErrorConstants.MedicalRecordMessage.ExaminationNotFound);
            }

            found.RequestStatus = ImagingRequestConstants.Cancelled;
            found.CancelReason = cancelReason;
            found.UpdatedAt = DateTimeOffset.UtcNow;

            await _imagingRequestRepository.SaveChangesAsync(cancellationToken);
            return ToResponse(found, examination.PatientId);
        }

        public async Task<List<ImagingRequestQueueResponse>> GetQueueAsync(CancellationToken cancellationToken = default)
        {
            var requests = await _imagingRequestRepository.GetQueueAsync(cancellationToken);
            return requests
                .Where(request => ImagingRequestConstants.QueueStatuses.Contains(request.RequestStatus))
                .OrderBy(request => request.CreatedAt)
                .ThenBy(request => request.Id)
                .Select(ToQueueResponse)
                .ToList();
        }

        public async Task<ImagingRequestResponse> CompleteAsync(
            long id,
            string? technicianUserId = null,
            string? notes = null,
            CancellationToken cancellationToken = default)
        {
            var request = await _imagingRequestRepository.GetTrackedByIdAsync(id, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(request != null, ErrorConstants.ImagingRequestMessage.RequestNotFound);

            var now = DateTimeOffset.UtcNow;
            request!.RequestStatus = ImagingRequestConstants.Completed;
            request.UpdatedAt = now;
            await _imagingRequestRepository.SaveChangesAsync(cancellationToken);

            var examination = await _imagingRequestRepository.GetExaminationAsync(request.ExaminationId, cancellationToken);
            if (examination?.Appointment != null)
            {
                examination.Appointment.Status = AppointmentConstants.CheckedInStatus;
                examination.Appointment.Priority = PriorityConstants.Urgent;
                examination.Appointment.UpdatedAt = now;
                if (_appointmentRepository != null)
                {
                    await _appointmentRepository.UpdateAsync(examination.Appointment);
                }
            }

            if (_queueService != null && examination?.Appointment != null)
            {
                await _queueService.UpdateStatusAsync(examination.AppointmentId, "Imaging", "COMPLETED", cancellationToken);
                await _queueService.UpdateStatusAsync(examination.AppointmentId, "Examination", "WAITING", cancellationToken);
            }

            return ToResponse(request, examination?.PatientId ?? 0);
        }

        public async Task<bool> ProcessSimulatorWebhookAsync(
            ImagingSimulatorWebhookPayload payload,
            CancellationToken cancellationToken = default)
        {
            if (!string.Equals(payload.State, "Completed", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(payload.EventType, "capture.completed", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            var orderRef = payload.OrderReference?.Trim() ?? string.Empty;
            if (orderRef.StartsWith("IR-", StringComparison.OrdinalIgnoreCase))
            {
                orderRef = orderRef.Substring(3);
            }

            if (!long.TryParse(orderRef, out var requestId))
            {
                return false;
            }

            var request = await _imagingRequestRepository.GetTrackedByIdAsync(requestId, cancellationToken);
            if (request == null)
            {
                return false;
            }

            var now = DateTimeOffset.UtcNow;
            request.RequestStatus = ImagingRequestConstants.Completed;
            request.UpdatedAt = now;
            await _imagingRequestRepository.SaveChangesAsync(cancellationToken);

            var examination = await _imagingRequestRepository.GetExaminationAsync(request.ExaminationId, cancellationToken);
            if (examination?.Appointment != null)
            {
                examination.Appointment.Status = AppointmentConstants.CheckedInStatus;
                examination.Appointment.Priority = PriorityConstants.Urgent;
                examination.Appointment.UpdatedAt = now;
                if (_appointmentRepository != null)
                {
                    await _appointmentRepository.UpdateAsync(examination.Appointment);
                }
            }

            if (_queueService != null && examination?.Appointment != null)
            {
                await _queueService.UpdateStatusAsync(examination.AppointmentId, "Imaging", "COMPLETED", cancellationToken);
                await _queueService.UpdateStatusAsync(examination.AppointmentId, "Examination", "WAITING", cancellationToken);
            }

            return true;
        }

        private static string RequireValue(string? value, string missingMessage)
        {
            var trimmed = value?.Trim() ?? string.Empty;
            ConditionGuard.Ensure(trimmed.Length > 0, missingMessage);
            return trimmed;
        }

        private static ImagingRequestResponse ToResponse(ImagingRequest request, int patientId)
        {
            return new ImagingRequestResponse
            {
                Id = request.Id,
                ExaminationId = request.ExaminationId,
                PatientId = patientId,
                ImagingType = request.ImagingType,
                TargetArea = request.TargetArea ?? string.Empty,
                ClinicalIndication = request.ClinicalIndication ?? string.Empty,
                RequestStatus = request.RequestStatus,
                CancelReason = request.CancelReason,
                CreatedAt = request.CreatedAt
            };
        }

        private static ImagingRequestQueueResponse ToQueueResponse(ImagingRequest request)
        {
            return new ImagingRequestQueueResponse
            {
                Id = request.Id,
                PatientId = request.Examination?.PatientId ?? 0,
                PatientName = request.Examination?.Patient?.FullName?.Trim() ?? string.Empty,
                DoctorName = request.RequestedByDoctor?.FullName?.Trim() ?? string.Empty,
                ImagingType = request.ImagingType,
                TargetArea = request.TargetArea ?? string.Empty,
                ClinicalIndication = request.ClinicalIndication ?? string.Empty,
                RequestStatus = request.RequestStatus,
                CreatedAt = request.CreatedAt
            };
        }
    }
}
