using Microsoft.Extensions.Logging;
using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    // In-app notifications (F-CRM-03): reading for every role, and one place that writes them for the rest of the system
    public class NotificationService : INotificationService
    {
        private readonly INotificationRepository _repository;
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(INotificationRepository repository, ILogger<NotificationService> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        public async Task<NotificationListResponse> GetMineAsync(string userId, NotificationQueryParameters query, CancellationToken cancellationToken = default)
        {
            var page = Math.Max(1, query.Page);
            var pageSize = query.PageSize < 1 ? NotificationConstants.DefaultPageSize : Math.Min(query.PageSize, NotificationConstants.MaxPageSize);

            var (items, total) = await _repository.GetPageAsync(userId, query.UnreadOnly, page, pageSize, cancellationToken);
            var unread = await _repository.CountUnreadAsync(userId, cancellationToken);

            return new NotificationListResponse
            {
                Items = items.Select(ToResponse).ToList(),
                Page = page,
                PageSize = pageSize,
                TotalItems = total,
                TotalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize)),
                UnreadCount = unread
            };
        }

        public async Task<UnreadCountResponse> GetUnreadCountAsync(string userId, CancellationToken cancellationToken = default)
        {
            return new UnreadCountResponse { UnreadCount = await _repository.CountUnreadAsync(userId, cancellationToken) };
        }

        public async Task<UnreadCountResponse> MarkReadAsync(string userId, long id, CancellationToken cancellationToken = default)
        {
            // Someone else's notification looks the same as a missing one
            var notification = await _repository.GetOwnAsync(id, userId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(notification != null, ErrorConstants.NotificationMessage.NotFound);

            if (!notification!.IsRead)
            {
                notification.IsRead = true;
                notification.ReadAt = DateTimeOffset.UtcNow;
                await _repository.SaveChangesAsync(cancellationToken);
            }

            return await GetUnreadCountAsync(userId, cancellationToken);
        }

        public async Task<UnreadCountResponse> MarkAllReadAsync(string userId, CancellationToken cancellationToken = default)
        {
            await _repository.MarkAllReadAsync(userId, DateTimeOffset.UtcNow, cancellationToken);
            return new UnreadCountResponse { UnreadCount = 0 };
        }

        public async Task NotifyUsersAsync(IEnumerable<string?> userIds, NotificationContent content, CancellationToken cancellationToken = default)
        {
            var notifications = new List<Notification>();
            try
            {
                var now = DateTimeOffset.UtcNow;
                notifications = userIds
                    .Where(id => !string.IsNullOrWhiteSpace(id))
                    .Distinct()
                    .Select(id => new Notification
                    {
                        UserId = id!,
                        Title = content.Title,
                        Message = content.Message,
                        NotificationType = NotificationConstants.TypeInApp,
                        Channel = NotificationConstants.ChannelInApp,
                        ReferenceType = content.ReferenceType,
                        ReferenceId = content.ReferenceId,
                        IsRead = false,
                        SentAt = now,
                        DeliveryStatus = NotificationConstants.DeliverySent,
                        CreatedAt = now
                    })
                    .ToList();
                if (notifications.Count == 0)
                {
                    return;
                }

                await _repository.AddRangeAsync(notifications, cancellationToken);
                await _repository.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                // The change that caused the notification is already saved; a missing notification must not undo it
                _repository.Detach(notifications);
                _logger.LogWarning(ex, "Could not save notification \"{Title}\" ({ReferenceType} {ReferenceId})",
                    content.Title, content.ReferenceType, content.ReferenceId);
            }
        }

        public async Task NotifyRolesAsync(IReadOnlyCollection<string> roles, NotificationContent content, string? exceptUserId = null, CancellationToken cancellationToken = default)
        {
            try
            {
                var userIds = await _repository.GetActiveStaffUserIdsAsync(roles, cancellationToken);
                await NotifyUsersAsync(userIds.Where(id => id != exceptUserId), content, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not find the staff to notify for \"{Title}\"", content.Title);
            }
        }

        public async Task NotifyStaffAsync(int? staffProfileId, NotificationContent content, CancellationToken cancellationToken = default)
        {
            if (!staffProfileId.HasValue)
            {
                return;
            }

            try
            {
                var userId = await _repository.GetStaffUserIdAsync(staffProfileId.Value, cancellationToken);
                await NotifyUsersAsync(new[] { userId }, content, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not find staff {StaffProfileId} to notify for \"{Title}\"", staffProfileId, content.Title);
            }
        }

        public async Task NotifyPatientAsync(int patientId, NotificationContent content, CancellationToken cancellationToken = default)
        {
            try
            {
                var userId = await _repository.GetPatientUserIdAsync(patientId, cancellationToken);
                await NotifyUsersAsync(new[] { userId }, content, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not find patient {PatientId} to notify for \"{Title}\"", patientId, content.Title);
            }
        }

        private static NotificationResponse ToResponse(Notification x) => new()
        {
            Id = x.Id,
            Title = x.Title,
            Message = x.Message,
            NotificationType = x.NotificationType,
            ReferenceType = x.ReferenceType,
            ReferenceId = x.ReferenceId,
            IsRead = x.IsRead,
            ReadAt = x.ReadAt,
            CreatedAt = x.CreatedAt
        };
    }
}
