using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IRegistrationRepository
    {
        Task<ApplicationUser?> FindUserByPhoneAsync(IReadOnlyCollection<string> phoneNumbers);
        Task<List<Patient>> FindUnlinkedPatientsByPhoneAsync(IReadOnlyCollection<string> phoneNumbers);

        // Commits only when shouldCommit returns true for the result; otherwise every change is rolled back.
        Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> action, Func<T, bool> shouldCommit);
    }
}
