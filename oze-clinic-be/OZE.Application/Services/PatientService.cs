using System.Security.Cryptography;
using AutoMapper;
using Microsoft.Extensions.Logging;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    public class PatientService : IPatientService
    {
        private readonly IPatientRepository _patientRepository;
        private readonly IMapper _mapper;
        private readonly ILogger<PatientService> _logger;

        public PatientService(
            IPatientRepository patientRepository,
            IMapper mapper,
            ILogger<PatientService> logger)
        {
            _patientRepository = patientRepository;
            _mapper = mapper;
            _logger = logger;
        }

        public async Task<ApiResponse<PagedResult<PatientDto>>> GetPatientsAsync(
            PatientQueryParameters parameters,
            CancellationToken cancellationToken = default)
        {
            var pagedPatients = await _patientRepository.GetAllAsync(parameters, cancellationToken);
            var dtos = _mapper.Map<List<PatientDto>>(pagedPatients.Items);

            var result = new PagedResult<PatientDto>(
                dtos,
                pagedPatients.TotalCount,
                pagedPatients.PageNumber,
                pagedPatients.PageSize);

            return ApiResponse<PagedResult<PatientDto>>.SuccessResult(result);
        }

        public async Task<ApiResponse<PatientDetailDto>> GetPatientByIdAsync(
            int id,
            CancellationToken cancellationToken = default)
        {
            var patient = await _patientRepository.GetByIdAsync(id, includeMedicalProfiles: true, asNoTracking: true, cancellationToken);
            if (patient == null)
            {
                return ApiResponse<PatientDetailDto>.FailureResult(ErrorConstants.PatientMessage.PatientNotFound);
            }

            var dto = _mapper.Map<PatientDetailDto>(patient);
            return ApiResponse<PatientDetailDto>.SuccessResult(dto);
        }

        public async Task<ApiResponse<PatientDetailDto>> GetPatientByCodeAsync(
            string code,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(code))
            {
                return ApiResponse<PatientDetailDto>.FailureResult(ErrorConstants.PatientMessage.PatientNotFound);
            }

            var patient = await _patientRepository.GetByCodeAsync(code.Trim(), includeMedicalProfiles: true, cancellationToken);
            if (patient == null)
            {
                return ApiResponse<PatientDetailDto>.FailureResult(ErrorConstants.PatientMessage.PatientNotFound);
            }

            var dto = _mapper.Map<PatientDetailDto>(patient);
            return ApiResponse<PatientDetailDto>.SuccessResult(dto);
        }

        public async Task<ApiResponse<PatientDto>> CreatePatientAsync(
            CreatePatientRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.FullName))
            {
                return ApiResponse<PatientDto>.FailureResult("FullName is required.");
            }

            if (!PatientConstants.Gender.TryNormalize(request.Gender, out var normalizedGender))
            {
                return ApiResponse<PatientDto>.FailureResult(ErrorConstants.PatientMessage.InvalidGender);
            }

            if (!PatientConstants.BloodType.TryNormalize(request.BloodType, out var normalizedBloodType))
            {
                return ApiResponse<PatientDto>.FailureResult(ErrorConstants.PatientMessage.InvalidBloodType);
            }

            if (request.DateOfBirth.HasValue && request.DateOfBirth.Value > DateOnly.FromDateTime(DateTime.UtcNow))
            {
                return ApiResponse<PatientDto>.FailureResult(ErrorConstants.PatientMessage.InvalidDateOfBirth);
            }

            string? normalizedPhone = null;
            if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
            {
                if (PhoneNumberHelper.TryNormalize(request.PhoneNumber, out var validPhone))
                {
                    normalizedPhone = validPhone;
                }
                else
                {
                    return ApiResponse<PatientDto>.FailureResult(ErrorConstants.AuthMessage.InvalidPhone);
                }

                var isPhoneInUse = await _patientRepository.ExistsByPhoneAsync(normalizedPhone, null, cancellationToken);
                if (isPhoneInUse)
                {
                    return ApiResponse<PatientDto>.FailureResult(ErrorConstants.PatientMessage.PhoneExist);
                }
            }

            // Generate unique PatientCode
            string patientCode;
            do
            {
                patientCode = GeneratePatientCode();
            }
            while (await _patientRepository.ExistsByCodeAsync(patientCode, cancellationToken));

            var patient = _mapper.Map<Patient>(request);
            patient.PatientCode = patientCode;
            patient.FullName = request.FullName.Trim();
            patient.PhoneNumber = normalizedPhone;
            patient.Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant();
            patient.Gender = normalizedGender;
            patient.BloodType = normalizedBloodType;
            patient.Address = request.Address?.Trim();
            patient.InsuranceNumber = request.InsuranceNumber?.Trim();
            patient.EmergencyContactName = request.EmergencyContactName?.Trim();
            patient.EmergencyContactPhone = request.EmergencyContactPhone?.Trim();
            patient.Notes = request.Notes?.Trim();
            patient.CreatedAt = DateTimeOffset.UtcNow;

            await _patientRepository.AddAsync(patient, cancellationToken);
            await _patientRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("New patient created: {FullName} (Code: {PatientCode})", patient.FullName, patient.PatientCode);

            var dto = _mapper.Map<PatientDto>(patient);
            return ApiResponse<PatientDto>.SuccessResult(dto, "Patient created successfully");
        }

        public async Task<ApiResponse<PatientDto>> UpdatePatientAsync(
            int id,
            UpdatePatientRequest request,
            CancellationToken cancellationToken = default)
        {
            var patient = await _patientRepository.GetByIdAsync(id, cancellationToken: cancellationToken);
            if (patient == null)
            {
                return ApiResponse<PatientDto>.FailureResult(ErrorConstants.PatientMessage.PatientNotFound);
            }

            if (string.IsNullOrWhiteSpace(request.FullName))
            {
                return ApiResponse<PatientDto>.FailureResult("FullName is required.");
            }

            if (!PatientConstants.Gender.TryNormalize(request.Gender, out var normalizedGender))
            {
                return ApiResponse<PatientDto>.FailureResult(ErrorConstants.PatientMessage.InvalidGender);
            }

            if (!PatientConstants.BloodType.TryNormalize(request.BloodType, out var normalizedBloodType))
            {
                return ApiResponse<PatientDto>.FailureResult(ErrorConstants.PatientMessage.InvalidBloodType);
            }

            if (request.DateOfBirth.HasValue && request.DateOfBirth.Value > DateOnly.FromDateTime(DateTime.UtcNow))
            {
                return ApiResponse<PatientDto>.FailureResult(ErrorConstants.PatientMessage.InvalidDateOfBirth);
            }

            string? normalizedPhone = null;
            if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
            {
                if (PhoneNumberHelper.TryNormalize(request.PhoneNumber, out var validPhone))
                {
                    normalizedPhone = validPhone;
                }
                else
                {
                    return ApiResponse<PatientDto>.FailureResult(ErrorConstants.AuthMessage.InvalidPhone);
                }

                var isPhoneInUse = await _patientRepository.ExistsByPhoneAsync(normalizedPhone, id, cancellationToken);
                if (isPhoneInUse)
                {
                    return ApiResponse<PatientDto>.FailureResult(ErrorConstants.PatientMessage.PhoneExist);
                }
            }

            patient.FullName = request.FullName.Trim();
            patient.PhoneNumber = normalizedPhone;
            patient.Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant();
            patient.DateOfBirth = request.DateOfBirth;
            patient.Gender = normalizedGender;
            patient.BloodType = normalizedBloodType;
            patient.Address = request.Address?.Trim();
            patient.InsuranceNumber = request.InsuranceNumber?.Trim();
            patient.EmergencyContactName = request.EmergencyContactName?.Trim();
            patient.EmergencyContactPhone = request.EmergencyContactPhone?.Trim();
            patient.Notes = request.Notes?.Trim();
            patient.UpdatedAt = DateTimeOffset.UtcNow;

            await _patientRepository.UpdateAsync(patient, cancellationToken);
            await _patientRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Patient {PatientId} updated: {FullName} (Code: {PatientCode})", id, patient.FullName, patient.PatientCode);

            var dto = _mapper.Map<PatientDto>(patient);
            return ApiResponse<PatientDto>.SuccessResult(dto, "Patient updated successfully");
        }

        public async Task<ApiResponse<bool>> DeletePatientAsync(
            int id,
            CancellationToken cancellationToken = default)
        {
            var patient = await _patientRepository.GetByIdAsync(id, cancellationToken: cancellationToken);
            if (patient == null)
            {
                return ApiResponse<bool>.FailureResult(ErrorConstants.PatientMessage.PatientNotFound);
            }

            patient.DeletedAt = DateTimeOffset.UtcNow;
            await _patientRepository.UpdateAsync(patient, cancellationToken);
            await _patientRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Patient {PatientId} soft-deleted.", id);
            return ApiResponse<bool>.SuccessResult(true, "Patient deleted successfully");
        }

        public async Task<ApiResponse<PatientMedicalProfileDto>> AddMedicalProfileAsync(
            int patientId,
            CreateMedicalProfileRequest request,
            string? createdByUserId = null,
            CancellationToken cancellationToken = default)
        {
            var patient = await _patientRepository.GetByIdAsync(patientId, cancellationToken: cancellationToken);
            if (patient == null)
            {
                return ApiResponse<PatientMedicalProfileDto>.FailureResult(ErrorConstants.PatientMessage.PatientNotFound);
            }

            if (!PatientConstants.MedicalProfile.TryNormalizeRecordType(request.RecordType, out var normalizedRecordType))
            {
                return ApiResponse<PatientMedicalProfileDto>.FailureResult(ErrorConstants.PatientMessage.InvalidRecordType);
            }

            if (!PatientConstants.MedicalProfile.TryNormalizeSeverity(request.Severity, out var normalizedSeverity))
            {
                return ApiResponse<PatientMedicalProfileDto>.FailureResult(ErrorConstants.PatientMessage.InvalidSeverity);
            }

            if (!PatientConstants.MedicalProfile.TryNormalizeStatus(request.Status, out var normalizedStatus))
            {
                return ApiResponse<PatientMedicalProfileDto>.FailureResult(ErrorConstants.PatientMessage.InvalidStatus);
            }

            var profile = _mapper.Map<PatientMedicalProfile>(request);
            profile.PatientId = patientId;
            profile.RecordType = normalizedRecordType!;
            profile.Title = request.Title.Trim();
            profile.Description = request.Description?.Trim();
            profile.Severity = normalizedSeverity;
            profile.Status = normalizedStatus!;
            profile.CreatedByUserId = createdByUserId;
            profile.CreatedAt = DateTimeOffset.UtcNow;

            await _patientRepository.AddMedicalProfileAsync(profile, cancellationToken);
            await _patientRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Medical profile added for patient {PatientId}: {Title} ({RecordType})", patientId, profile.Title, profile.RecordType);

            var dto = _mapper.Map<PatientMedicalProfileDto>(profile);
            return ApiResponse<PatientMedicalProfileDto>.SuccessResult(dto, "Medical profile added successfully");
        }

        private static string GeneratePatientCode()
        {
            return $"BN-{DateTime.UtcNow:yyMMdd}-{RandomNumberGenerator.GetInt32(0, 1_000_000):D6}";
        }
    }
}
