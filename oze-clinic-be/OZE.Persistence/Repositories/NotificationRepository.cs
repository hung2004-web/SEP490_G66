using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class NotificationRepository : INotificationRepository
    {
        private readonly AppIdentityDbContext _context;

        public NotificationRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public async Task<(List<Notification> Items, int TotalCount)> GetPageAsync(string userId, bool unreadOnly, int page, int pageSize, CancellationToken cancellationToken = default)
        {
            var query = _context.Notifications.AsNoTracking().Where(x => x.UserId == userId);
            if (unreadOnly)
            {
                query = query.Where(x => !x.IsRead);
            }

            var total = await query.CountAsync(cancellationToken);
            var items = await query
                .OrderByDescending(x => x.CreatedAt)
                .ThenByDescending(x => x.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);
            return (items, total);
        }

        public Task<int> CountUnreadAsync(string userId, CancellationToken cancellationToken = default)
        {
            return _context.Notifications.CountAsync(x => x.UserId == userId && !x.IsRead, cancellationToken);
        }

        public Task<Notification?> GetOwnAsync(long id, string userId, CancellationToken cancellationToken = default)
        {
            return _context.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, cancellationToken);
        }

        public Task<int> MarkAllReadAsync(string userId, DateTimeOffset readAt, CancellationToken cancellationToken = default)
        {
            return _context.Notifications
                .Where(x => x.UserId == userId && !x.IsRead)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.IsRead, true).SetProperty(x => x.ReadAt, readAt), cancellationToken);
        }

        public Task<List<string>> GetActiveStaffUserIdsAsync(IReadOnlyCollection<string> roles, CancellationToken cancellationToken = default)
        {
            return (
                from profile in _context.StaffProfiles.AsNoTracking()
                join userRole in _context.UserRoles on profile.UserId equals userRole.UserId
                join role in _context.Roles on userRole.RoleId equals role.Id
                where profile.IsActive && roles.Contains(role.Name!)
                select profile.UserId)
                .Distinct()
                .ToListAsync(cancellationToken);
        }

        public Task<string?> GetStaffUserIdAsync(int staffProfileId, CancellationToken cancellationToken = default)
        {
            return _context.StaffProfiles.AsNoTracking()
                .Where(x => x.Id == staffProfileId)
                .Select(x => (string?)x.UserId)
                .FirstOrDefaultAsync(cancellationToken);
        }

        public Task<string?> GetPatientUserIdAsync(int patientId, CancellationToken cancellationToken = default)
        {
            return _context.Patients.AsNoTracking()
                .Where(x => x.Id == patientId)
                .Select(x => x.UserId)
                .FirstOrDefaultAsync(cancellationToken);
        }

        public Task AddRangeAsync(IEnumerable<Notification> notifications, CancellationToken cancellationToken = default)
        {
            return _context.Notifications.AddRangeAsync(notifications, cancellationToken);
        }

        public void Detach(IEnumerable<Notification> notifications)
        {
            foreach (var notification in notifications)
            {
                _context.Entry(notification).State = EntityState.Detached;
            }
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return _context.SaveChangesAsync(cancellationToken);
        }
    }
}
