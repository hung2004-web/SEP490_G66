using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Application.Interfaces
{
    public interface IPatientService
    {
        Task<ApiResponse<PagedResult<PatientDto>>> GetPatientsAsync(PatientQueryParameters parameters, CancellationToken cancellationToken = default);
        Task<ApiResponse<PatientDetailDto>> GetPatientByIdAsync(int id, CancellationToken cancellationToken = default);
        Task<ApiResponse<PatientDetailDto>> GetPatientByCodeAsync(string code, CancellationToken cancellationToken = default);
        Task<ApiResponse<PatientDto>> CreatePatientAsync(CreatePatientRequest request, CancellationToken cancellationToken = default);
        Task<ApiResponse<PatientDto>> UpdatePatientAsync(int id, UpdatePatientRequest request, CancellationToken cancellationToken = default);
        Task<ApiResponse<bool>> DeletePatientAsync(int id, CancellationToken cancellationToken = default);
        Task<ApiResponse<PatientMedicalProfileDto>> AddMedicalProfileAsync(int patientId, CreateMedicalProfileRequest request, string? createdByUserId = null, CancellationToken cancellationToken = default);
    }
}
