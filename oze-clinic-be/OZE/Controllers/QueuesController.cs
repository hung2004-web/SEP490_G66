using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace OZE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class QueuesController : BaseApiController
    {
        private readonly IQueueService _queueService;

        public QueuesController(IQueueService queueService)
        {
            _queueService = queueService;
        }

        /// <summary>
        /// Retrieves the active queue entries for the physical clinic display board or kiosk.
        /// Public or authenticated so TV monitors at the lobby can show live queue numbers without credentials.
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<List<QueueEntryResponse>>>> GetQueueAsync(
            [FromQuery] string? queueType,
            [FromQuery] int? roomId,
            CancellationToken cancellationToken)
        {
            var result = await _queueService.GetQueueEntriesAsync(queueType, roomId, cancellationToken);
            return Ok(ApiResponse<List<QueueEntryResponse>>.SuccessResult(result));
        }

        /// <summary>
        /// Calls the next waiting patient in the queue for a specific room or queue type.
        /// </summary>
        [HttpPost("call-next")]
        [Authorize(Roles = $"{RoleConstants.DoctorRole},{RoleConstants.ReceptionistRole},{RoleConstants.DentalImagingTechnicianRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<QueueEntryResponse>>> CallNextAsync(
            [FromQuery] string queueType,
            [FromQuery] int? roomId,
            CancellationToken cancellationToken)
        {
            var result = await _queueService.CallNextAsync(queueType, roomId, cancellationToken);
            if (result == null)
            {
                return Ok(ApiResponse<QueueEntryResponse?>.SuccessResult(null, "Không có bệnh nhân đang chờ trong hàng đợi."));
            }

            return Ok(ApiResponse<QueueEntryResponse>.SuccessResult(result, $"Gọi số {result.QueueNumber} thành công."));
        }
    }
}
