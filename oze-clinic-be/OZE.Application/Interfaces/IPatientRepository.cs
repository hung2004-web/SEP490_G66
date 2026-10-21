using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IPatientRepository
    {
        // The record is tracked, so its changes are saved together with the account by UserManager.UpdateAsync.
        Task<Patient?> GetByUserIdAsync(string userId);
        Task<bool> IsPhoneInUseAsync(IReadOnlyCollection<string> phoneNumbers, int excludedPatientId);

        Task<Patient?> GetByIdAsync(int id, bool includeMedicalProfiles = false, bool asNoTracking = false, CancellationToken cancellationToken = default);
        Task<Patient?> GetByCodeAsync(string patientCode, bool includeMedicalProfiles = false, CancellationToken cancellationToken = default);
        Task<PagedResult<Patient>> GetAllAsync(PatientQueryParameters parameters, CancellationToken cancellationToken = default);
        Task<bool> ExistsByPhoneAsync(string phone, int? excludeId = null, CancellationToken cancellationToken = default);
        Task<bool> ExistsByCodeAsync(string code, CancellationToken cancellationToken = default);
        Task AddAsync(Patient patient, CancellationToken cancellationToken = default);
        Task UpdateAsync(Patient patient, CancellationToken cancellationToken = default);
        Task AddMedicalProfileAsync(PatientMedicalProfile profile, CancellationToken cancellationToken = default);
        Task SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
