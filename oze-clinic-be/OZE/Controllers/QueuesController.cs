using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace OZE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class QueuesController : BaseApiController
    {
        private static readonly string[] StaffRoles =
        {
            RoleConstants.DoctorRole, RoleConstants.ReceptionistRole, RoleConstants.DentalImagingTechnicianRole, RoleConstants.ClinicManagerRole
        };

        private readonly IQueueService _queueService;

        public QueuesController(IQueueService queueService)
        {
            _queueService = queueService;
        }

        /// <summary>
        /// Retrieves the active queue entries for the physical clinic display board or kiosk.
        /// Public so TV monitors at the lobby can show live queue numbers without credentials, but then the
        /// patient names are masked and the codes and notes are left out; clinic staff signed in see everything.
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<List<QueueEntryResponse>>>> GetQueueAsync(
            [FromQuery] string? queueType,
            [FromQuery] int? roomId,
            CancellationToken cancellationToken)
        {
            var isStaff = StaffRoles.Any(User.IsInRole);
            var result = await _queueService.GetQueueEntriesAsync(queueType, roomId, isStaff, cancellationToken);
            return Ok(ApiResponse<List<QueueEntryResponse>>.SuccessResult(result));
        }

        /// <summary>
        /// Calls the next waiting patient in the queue for a specific room or queue type.
        /// A doctor is only given the patients booked with that doctor.
        /// </summary>
        [HttpPost("call-next")]
        [Authorize(Roles = $"{RoleConstants.DoctorRole},{RoleConstants.ReceptionistRole},{RoleConstants.DentalImagingTechnicianRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<QueueEntryResponse>>> CallNextAsync(
            [FromQuery] string queueType,
            [FromQuery] int? roomId,
            CancellationToken cancellationToken)
        {
            var result = await _queueService.CallNextAsync(queueType, roomId, LimitedDoctorUserId, cancellationToken);
            if (result == null)
            {
                return Ok(ApiResponse<QueueEntryResponse?>.SuccessResult(null, "Không có bệnh nhân đang chờ trong hàng đợi."));
            }

            return Ok(ApiResponse<QueueEntryResponse>.SuccessResult(result, $"Gọi số {result.QueueNumber} thành công."));
        }

        /// <summary>
        /// The patient was called but is not there: the number goes back to waiting and steps back a few places so others
        /// can go first. A patient still absent when the morning ends is marked NO_SHOW.
        /// </summary>
        [HttpPost("{id:long}/skip")]
        [Authorize(Roles = $"{RoleConstants.DoctorRole},{RoleConstants.ReceptionistRole},{RoleConstants.DentalImagingTechnicianRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<QueueEntryResponse>>> SkipAsync(long id, CancellationToken cancellationToken)
        {
            var result = await _queueService.SkipAsync(id, LimitedDoctorUserId, cancellationToken);
            return Ok(ApiResponse<QueueEntryResponse>.SuccessResult(result, $"Số {result.QueueNumber} vắng mặt, đã lùi xuống."));
        }

        // Reception and managers work for the whole clinic; a doctor on their own is limited to their own patients
        private string? LimitedDoctorUserId =>
            User.IsInRole(RoleConstants.DoctorRole) && !User.IsInRole(RoleConstants.ReceptionistRole) && !User.IsInRole(RoleConstants.ClinicManagerRole)
                ? CurrentUserId ?? string.Empty
                : null;
    }
}
