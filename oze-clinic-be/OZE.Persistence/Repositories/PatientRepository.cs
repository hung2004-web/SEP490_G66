using Microsoft.EntityFrameworkCore;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;
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

        public async Task LockAccountAsync(string userId, CancellationToken cancellationToken = default)
        {
            var newStamp = Guid.NewGuid().ToString();
            await _context.Users.Where(x => x.Id == userId).ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.LockoutEnabled, true)
                .SetProperty(x => x.LockoutEnd, DateTimeOffset.MaxValue)
                .SetProperty(x => x.SecurityStamp, newStamp), cancellationToken);
            var now = DateTimeOffset.UtcNow;
            await _context.UserRefreshTokens.Where(x => x.UserId == userId && x.RevokedAt == null)
                .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.RevokedAt, now), cancellationToken);
        }

        public async Task<bool> HasUnfinishedAppointmentsAsync(int patientId, DateOnly today, CancellationToken cancellationToken = default)
        {
            return await _context.Appointments.AnyAsync(x => x.PatientId == patientId
                && x.AppointmentDate >= today
                && AppointmentConstants.UnfinishedStatuses.Contains(x.Status), cancellationToken);
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

        public async Task<Patient?> GetByIdAsync(int id, bool includeMedicalProfiles = false, bool asNoTracking = false, CancellationToken cancellationToken = default)
        {
            var query = asNoTracking ? _context.Patients.AsNoTracking() : _context.Patients;
            query = query.Where(p => p.Id == id && p.DeletedAt == null);

            if (includeMedicalProfiles)
            {
                query = query.Include(p => p.MedicalProfiles)
                             .Include(p => p.Appointments);
            }

            return await query.FirstOrDefaultAsync(cancellationToken);
        }

        public async Task<Patient?> GetByCodeAsync(string patientCode, bool includeMedicalProfiles = false, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(patientCode))
            {
                return null;
            }

            var code = patientCode.Trim().ToUpperInvariant();
            var query = _context.Patients.AsNoTracking().Where(p => p.PatientCode == code && p.DeletedAt == null);

            if (includeMedicalProfiles)
            {
                query = query.Include(p => p.MedicalProfiles)
                             .Include(p => p.Appointments);
            }

            return await query.FirstOrDefaultAsync(cancellationToken);
        }

        public async Task<PagedResult<Patient>> GetAllAsync(PatientQueryParameters parameters, CancellationToken cancellationToken = default)
        {
            var query = _context.Patients.AsNoTracking().Where(p => p.DeletedAt == null);

            if (!string.IsNullOrWhiteSpace(parameters.SearchKeyword))
            {
                var kw = parameters.SearchKeyword.Trim();
                query = query.Where(p => p.FullName.Contains(kw) ||
                                         p.PatientCode.Contains(kw) ||
                                         (p.PhoneNumber != null && p.PhoneNumber.Contains(kw)) ||
                                         (p.Email != null && p.Email.Contains(kw)) ||
                                         (p.InsuranceNumber != null && p.InsuranceNumber.Contains(kw)));
            }

            if (!string.IsNullOrWhiteSpace(parameters.Gender))
            {
                var gender = parameters.Gender.Trim();
                query = query.Where(p => p.Gender == gender);
            }

            if (!string.IsNullOrWhiteSpace(parameters.BloodType))
            {
                var bloodType = parameters.BloodType.Trim();
                query = query.Where(p => p.BloodType == bloodType);
            }

            var totalCount = await query.CountAsync(cancellationToken);
            if (totalCount == 0)
            {
                return new PagedResult<Patient>(new List<Patient>(), 0, parameters.PageNumber, parameters.PageSize);
            }

            query = parameters.SortBy?.Trim().ToLowerInvariant() switch
            {
                "name" => parameters.SortDescending ? query.OrderByDescending(p => p.FullName) : query.OrderBy(p => p.FullName),
                "code" => parameters.SortDescending ? query.OrderByDescending(p => p.PatientCode) : query.OrderBy(p => p.PatientCode),
                "dob" => parameters.SortDescending ? query.OrderByDescending(p => p.DateOfBirth) : query.OrderBy(p => p.DateOfBirth),
                "createdat" => parameters.SortDescending ? query.OrderByDescending(p => p.CreatedAt) : query.OrderBy(p => p.CreatedAt),
                _ => parameters.SortDescending ? query.OrderByDescending(p => p.Id) : query.OrderBy(p => p.Id)
            };

            var items = await query
                .Skip((parameters.PageNumber - 1) * parameters.PageSize)
                .Take(parameters.PageSize)
                .ToListAsync(cancellationToken);

            return new PagedResult<Patient>(items, totalCount, parameters.PageNumber, parameters.PageSize);
        }

        public async Task<bool> ExistsByPhoneAsync(string phone, int? excludeId = null, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(phone))
            {
                return false;
            }

            var trimmed = phone.Trim();
            // The same number may be stored as +84..., 84... or 0..., so every form is looked for
            var variants = PhoneNumberHelper.TryNormalize(trimmed, out var e164) ? PhoneNumberHelper.GetLookupVariants(e164) : new[] { trimmed };
            var query = _context.Patients.AsNoTracking().Where(p => p.PhoneNumber != null && variants.Contains(p.PhoneNumber) && p.DeletedAt == null);
            if (excludeId.HasValue)
            {
                query = query.Where(p => p.Id != excludeId.Value);
            }

            return await query.AnyAsync(cancellationToken);
        }

        public async Task<bool> ExistsByCodeAsync(string code, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(code))
            {
                return false;
            }

            var normalized = code.Trim().ToUpperInvariant();
            return await _context.Patients.AsNoTracking().AnyAsync(p => p.PatientCode == normalized, cancellationToken);
        }

        public async Task AddAsync(Patient patient, CancellationToken cancellationToken = default)
        {
            await _context.Patients.AddAsync(patient, cancellationToken);
        }

        public Task UpdateAsync(Patient patient, CancellationToken cancellationToken = default)
        {
            if (_context.Entry(patient).State == EntityState.Detached)
            {
                _context.Patients.Update(patient);
            }
            return Task.CompletedTask;
        }

        public async Task AddMedicalProfileAsync(PatientMedicalProfile profile, CancellationToken cancellationToken = default)
        {
            await _context.PatientMedicalProfiles.AddAsync(profile, cancellationToken);
        }

        public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
