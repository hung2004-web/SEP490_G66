using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class RegistrationRepository : IRegistrationRepository
    {
        private readonly AppIdentityDbContext _context;

        public RegistrationRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public async Task<ApplicationUser?> FindUserByPhoneAsync(IReadOnlyCollection<string> phoneNumbers)
        {
            return await _context.Users
                .FirstOrDefaultAsync(x => x.PhoneNumber != null && phoneNumbers.Contains(x.PhoneNumber));
        }

        public async Task<List<Patient>> FindUnlinkedPatientsByPhoneAsync(IReadOnlyCollection<string> phoneNumbers)
        {
            return await _context.Patients
                .Where(x => x.UserId == null
                    && x.DeletedAt == null
                    && x.PhoneNumber != null
                    && phoneNumbers.Contains(x.PhoneNumber))
                .ToListAsync();
        }

        public async Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> action, Func<T, bool> shouldCommit)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();
                var result = await action();
                if (shouldCommit(result))
                {
                    await transaction.CommitAsync();
                }
                else
                {
                    await transaction.RollbackAsync();
                    _context.ChangeTracker.Clear();
                }

                return result;
            });
        }
    }
}
