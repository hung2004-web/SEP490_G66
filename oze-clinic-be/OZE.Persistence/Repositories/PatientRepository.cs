using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class PatientRepository : IPatientRepository
    {
        private readonly AppIdentityDbContext _context;

        public PatientRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public async Task<Patient?> GetByUserIdAsync(string userId)
        {
            return await _context.Patients
                .FirstOrDefaultAsync(x => x.UserId == userId && x.DeletedAt == null);
        }

        public async Task<bool> IsPhoneInUseAsync(IReadOnlyCollection<string> phoneNumbers, int excludedPatientId)
        {
            return await _context.Patients
                .AnyAsync(x => x.Id != excludedPatientId
                    && x.DeletedAt == null
                    && x.PhoneNumber != null
                    && phoneNumbers.Contains(x.PhoneNumber));
        }
    }
}
