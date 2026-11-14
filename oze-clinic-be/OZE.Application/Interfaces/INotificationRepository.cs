using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface INotificationRepository
    {
        // Newest first
        Task<(List<Notification> Items, int TotalCount)> GetPageAsync(string userId, bool unreadOnly, int page, int pageSize, CancellationToken cancellationToken = default);
        Task<int> CountUnreadAsync(string userId, CancellationToken cancellationToken = default);
        // Only a notification of that user (tracked)
        Task<Notification?> GetOwnAsync(long id, string userId, CancellationToken cancellationToken = default);
        Task<int> MarkAllReadAsync(string userId, DateTimeOffset readAt, CancellationToken cancellationToken = default);

        // Users of active staff in any of these roles
        Task<List<string>> GetActiveStaffUserIdsAsync(IReadOnlyCollection<string> roles, CancellationToken cancellationToken = default);
        Task<string?> GetStaffUserIdAsync(int staffProfileId, CancellationToken cancellationToken = default);
        // Null when the patient has no account
        Task<string?> GetPatientUserIdAsync(int patientId, CancellationToken cancellationToken = default);

        Task AddRangeAsync(IEnumerable<Notification> notifications, CancellationToken cancellationToken = default);
        // Stops tracking notifications that could not be saved, so the next save of the request does not retry them
        void Detach(IEnumerable<Notification> notifications);
        Task SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
