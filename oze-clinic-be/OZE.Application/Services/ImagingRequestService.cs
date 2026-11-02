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
                await _queueService.UpdateStatusAsync(examination.AppointmentId, QueueConstants.ExaminationType, QueueConstants.Waiting, cancellationToken);
                await _queueService.EnqueueAsync(
                    examination.AppointmentId,
                    QueueConstants.ImagingType,
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

            // Nothing to take any more: the patient leaves the imaging queue, unless another order of the visit is still waiting
            if (_queueService != null && !await HasOtherOpenRequestAsync(found, cancellationToken))
            {
                await _queueService.UpdateStatusAsync(examination.AppointmentId, QueueConstants.ImagingType, QueueConstants.Cancelled, cancellationToken);
            }

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
            ConditionGuard.Ensure(
                ImagingRequestConstants.QueueStatuses.Contains(request!.RequestStatus),
                string.Format(ErrorConstants.ImagingRequestMessage.RequestNotOpen, request.RequestStatus));

            var examination = await CompleteAndReturnPatientAsync(request, cancellationToken);

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

            // The simulator may send the same event again, and a cancelled order must stay cancelled: answer "done" and change nothing
            if (!ImagingRequestConstants.QueueStatuses.Contains(request.RequestStatus))
            {
                return true;
            }

            await CompleteAndReturnPatientAsync(request, cancellationToken);

            return true;
        }

        // Marks the request done and, when the patient is waiting for the doctor, puts the patient back at the front of the examination queue
        private async Task<Examination?> CompleteAndReturnPatientAsync(ImagingRequest request, CancellationToken cancellationToken)
        {
            var now = DateTimeOffset.UtcNow;
            request.RequestStatus = ImagingRequestConstants.Completed;
            request.UpdatedAt = now;
            await _imagingRequestRepository.SaveChangesAsync(cancellationToken);

            var examination = await _imagingRequestRepository.GetExaminationAsync(request.ExaminationId, cancellationToken);
            var appointment = examination?.Appointment;
            if (appointment == null)
            {
                return examination;
            }

            // A patient already taken back by the doctor, or already finished, is left as is
            var isWaiting = appointment.Status == AppointmentConstants.CheckedInStatus;
            if (isWaiting)
            {
                appointment.Priority = PriorityConstants.Urgent;
                appointment.UpdatedAt = now;
                if (_appointmentRepository != null)
                {
                    await _appointmentRepository.UpdateAsync(appointment);
                }
            }

            if (_queueService != null)
            {
                if (!await HasOtherOpenRequestAsync(request, cancellationToken))
                {
                    await _queueService.UpdateStatusAsync(appointment.Id, QueueConstants.ImagingType, QueueConstants.Completed, cancellationToken);
                }

                if (isWaiting)
                {
                    await _queueService.UpdateStatusAsync(appointment.Id, QueueConstants.ExaminationType, QueueConstants.Waiting, cancellationToken);
                    await _queueService.UpdatePriorityAsync(appointment.Id, QueueConstants.ExaminationType, PriorityConstants.Urgent, cancellationToken);
                }
            }

            return examination;
        }

        // Another order of the same examination still waiting for the technician or being taken
        private async Task<bool> HasOtherOpenRequestAsync(ImagingRequest request, CancellationToken cancellationToken)
        {
            var requests = await _imagingRequestRepository.GetByExaminationIdAsync(request.ExaminationId, cancellationToken);
            return requests.Any(x => x.Id != request.Id && ImagingRequestConstants.QueueStatuses.Contains(x.RequestStatus));
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
