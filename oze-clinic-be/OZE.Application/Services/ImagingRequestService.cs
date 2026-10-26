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

        public ImagingRequestService(
            IImagingRequestRepository imagingRequestRepository,
            IStaffRepository staffRepository)
        {
            _imagingRequestRepository = imagingRequestRepository;
            _staffRepository = staffRepository;
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

            return ToResponse(imagingRequest, examination.PatientId);
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
                CreatedAt = request.CreatedAt
            };
        }
    }
}
