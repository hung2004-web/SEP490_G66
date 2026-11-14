using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Controllers
{
    /// <summary>
    /// In-app notifications of the signed-in user, for every role (F-CRM-03).
    /// </summary>
    [Authorize]
    public class NotificationsController : BaseApiController
    {
        private readonly INotificationService _notificationService;

        public NotificationsController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        /// <summary>
        /// My notifications, newest first, with the unread count.
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<ApiResponse<NotificationListResponse>>> GetMineAsync(
            [FromQuery] NotificationQueryParameters query,
            CancellationToken cancellationToken)
        {
            var result = await _notificationService.GetMineAsync(CurrentUserId!, query, cancellationToken);
            return Ok(ApiResponse<NotificationListResponse>.SuccessResult(result));
        }

        /// <summary>
        /// How many of my notifications are unread (for the bell badge).
        /// </summary>
        [HttpGet("unread-count")]
        public async Task<ActionResult<ApiResponse<UnreadCountResponse>>> GetUnreadCountAsync(CancellationToken cancellationToken)
        {
            var result = await _notificationService.GetUnreadCountAsync(CurrentUserId!, cancellationToken);
            return Ok(ApiResponse<UnreadCountResponse>.SuccessResult(result));
        }

        /// <summary>
        /// Marks one of my notifications as read. Someone else's returns 404.
        /// </summary>
        [HttpPost("{id:long}/read")]
        public async Task<ActionResult<ApiResponse<UnreadCountResponse>>> MarkReadAsync([FromRoute] long id, CancellationToken cancellationToken)
        {
            var result = await _notificationService.MarkReadAsync(CurrentUserId!, id, cancellationToken);
            return Ok(ApiResponse<UnreadCountResponse>.SuccessResult(result));
        }

        /// <summary>
        /// Marks all of my notifications as read.
        /// </summary>
        [HttpPost("read-all")]
        public async Task<ActionResult<ApiResponse<UnreadCountResponse>>> MarkAllReadAsync(CancellationToken cancellationToken)
        {
            var result = await _notificationService.MarkAllReadAsync(CurrentUserId!, cancellationToken);
            return Ok(ApiResponse<UnreadCountResponse>.SuccessResult(result));
        }
    }
}
