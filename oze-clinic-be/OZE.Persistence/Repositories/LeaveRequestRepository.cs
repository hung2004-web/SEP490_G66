using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class LeaveRequestRepository : ILeaveRequestRepository
    {
        private const string WholeDayFilter = "WholeDay";

        private readonly AppIdentityDbContext _context;

        public LeaveRequestRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(LeaveRequest request, CancellationToken cancellationToken = default)
        {
            await _context.LeaveRequests.AddAsync(request, cancellationToken);
        }

        public Task<LeaveRequest?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
        {
            return _context.LeaveRequests
                .Include(x => x.StaffProfile)
                .Include(x => x.SubstituteStaffProfile)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        }

        public async Task<PagedResult<LeaveRequest>> GetPagedAsync(
            LeaveRequestQuery query,
            int? staffProfileId,
            CancellationToken cancellationToken = default)
        {
            var requests = _context.LeaveRequests
                .AsNoTracking()
                .Include(x => x.StaffProfile)
                .Include(x => x.SubstituteStaffProfile)
                .AsQueryable();

            if (staffProfileId.HasValue)
            {
                requests = requests.Where(x => x.StaffProfileId == staffProfileId.Value);
            }

            if (!string.IsNullOrWhiteSpace(query.Status))
            {
                requests = requests.Where(x => x.Status == query.Status);
            }

            if (!string.IsNullOrWhiteSpace(query.Slot))
            {
                requests = query.Slot == WholeDayFilter
                    ? requests.Where(x => x.Slot == null)
                    : requests.Where(x => x.Slot == query.Slot);
            }

            if (!string.IsNullOrWhiteSpace(query.Role))
            {
                requests = requests.Where(x => _context.UserRoles.Any(ur => ur.UserId == x.StaffProfile.UserId
                    && _context.Roles.Any(r => r.Id == ur.RoleId && r.Name == query.Role)));
            }

            if (query.FromDate.HasValue)
            {
                requests = requests.Where(x => x.LeaveDate >= query.FromDate.Value);
            }

            if (query.ToDate.HasValue)
            {
                requests = requests.Where(x => x.LeaveDate <= query.ToDate.Value);
            }

            if (!string.IsNullOrWhiteSpace(query.SearchKeyword))
            {
                var keyword = query.SearchKeyword.Trim();
                requests = requests.Where(x => x.StaffProfile.FullName.Contains(keyword) || x.Reason.Contains(keyword));
            }

            var totalCount = await requests.CountAsync(cancellationToken);

            // Waiting requests first, then the latest leave day
            var items = await requests
                .OrderByDescending(x => x.Status == LeaveRequestConstants.Pending)
                .ThenByDescending(x => x.LeaveDate)
                .ThenByDescending(x => x.Id)
                .Skip((query.PageNumber - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync(cancellationToken);

            return new PagedResult<LeaveRequest>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = query.PageNumber,
                PageSize = query.PageSize
            };
        }

        public Task<bool> HasActiveOverlapAsync(
            int staffProfileId,
            DateOnly date,
            string? slot,
            long? excludeId = null,
            CancellationToken cancellationToken = default)
        {
            // A whole-day request overlaps every slot of the day
            return _context.LeaveRequests.AnyAsync(x =>
                x.StaffProfileId == staffProfileId
                && x.LeaveDate == date
                && (x.Status == LeaveRequestConstants.Pending || x.Status == LeaveRequestConstants.Approved)
                && (slot == null || x.Slot == null || x.Slot == slot)
                && (excludeId == null || x.Id != excludeId),
                cancellationToken);
        }

        public Task<List<LeaveRequest>> GetApprovedOnDateAsync(DateOnly date, CancellationToken cancellationToken = default)
        {
            return _context.LeaveRequests
                .AsNoTracking()
                .Where(x => x.LeaveDate == date && x.Status == LeaveRequestConstants.Approved)
                .ToListAsync(cancellationToken);
        }

        public Task<List<StaffSchedule>> GetShiftsOnDateAsync(int staffProfileId, DateOnly date, CancellationToken cancellationToken = default)
        {
            return _context.StaffSchedules
                .Include(x => x.Room)
                .Where(x => x.StaffProfileId == staffProfileId && x.ScheduleDate == date)
                .OrderBy(x => x.ShiftStart)
                .ToListAsync(cancellationToken);
        }

        public Task<List<Appointment>> GetOpenAppointmentsOnDateAsync(int doctorId, DateOnly date, CancellationToken cancellationToken = default)
        {
            return _context.Appointments
                .Include(x => x.Patient)
                .Include(x => x.ServiceItems).ThenInclude(x => x.Service)
                .Where(x => x.DoctorId == doctorId
                    && x.AppointmentDate == date
                    && AppointmentConstants.UnfinishedStatuses.Contains(x.Status))
                .OrderBy(x => x.TimeSlotStart)
                .ToListAsync(cancellationToken);
        }

        public async Task<Dictionary<string, string>> GetRolesAsync(IEnumerable<string> userIds, CancellationToken cancellationToken = default)
        {
            var ids = userIds.Distinct().ToList();
            var rows = await (from ur in _context.UserRoles
                              join r in _context.Roles on ur.RoleId equals r.Id
                              where ids.Contains(ur.UserId)
                              select new { ur.UserId, r.Name })
                .ToListAsync(cancellationToken);

            return rows
                .GroupBy(x => x.UserId)
                .ToDictionary(g => g.Key, g => g.First().Name ?? string.Empty);
        }

        public Task<List<StaffProfile>> GetActiveStaffInRoleAsync(string role, CancellationToken cancellationToken = default)
        {
            return _context.StaffProfiles
                .AsNoTracking()
                .Where(x => x.IsActive
                    && _context.UserRoles.Any(ur => ur.UserId == x.UserId
                        && _context.Roles.Any(r => r.Id == ur.RoleId && r.Name == role)))
                .OrderBy(x => x.FullName)
                .ToListAsync(cancellationToken);
        }

        public async Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> action, CancellationToken cancellationToken = default)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
                try
                {
                    var result = await action();
                    await transaction.CommitAsync(cancellationToken);
                    return result;
                }
                catch
                {
                    await transaction.RollbackAsync(cancellationToken);
                    throw;
                }
            });
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return _context.SaveChangesAsync(cancellationToken);
        }
    }
}
