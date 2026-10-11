using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IPatientRepository
    {
        // The record is tracked, so its changes are saved together with the account by UserManager.UpdateAsync.
        Task<Patient?> GetByUserIdAsync(string userId);
        Task<bool> IsPhoneInUseAsync(IReadOnlyCollection<string> phoneNumbers, int excludedPatientId);
    }
}
