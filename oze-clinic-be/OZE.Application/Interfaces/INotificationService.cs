using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    public interface INotificationService
    {
        // Reading: every signed-in user sees only their own notifications
        Task<NotificationListResponse> GetMineAsync(string userId, NotificationQueryParameters query, CancellationToken cancellationToken = default);
        Task<UnreadCountResponse> GetUnreadCountAsync(string userId, CancellationToken cancellationToken = default);
        Task<UnreadCountResponse> MarkReadAsync(string userId, long id, CancellationToken cancellationToken = default);
        Task<UnreadCountResponse> MarkAllReadAsync(string userId, CancellationToken cancellationToken = default);

        // Sending. Called after the business change is saved; a failure is logged and never undoes that change.
        Task NotifyUsersAsync(IEnumerable<string?> userIds, NotificationContent content, CancellationToken cancellationToken = default);
        // Every active staff member in any of these roles (except the one who did the action)
        Task NotifyRolesAsync(IReadOnlyCollection<string> roles, NotificationContent content, string? exceptUserId = null, CancellationToken cancellationToken = default);
        Task NotifyStaffAsync(int? staffProfileId, NotificationContent content, CancellationToken cancellationToken = default);
        // Only when the patient has an account
        Task NotifyPatientAsync(int patientId, NotificationContent content, CancellationToken cancellationToken = default);
    }
}
