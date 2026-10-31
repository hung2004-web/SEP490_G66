using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api")]
    public class ImagingRequestsController : BaseApiController
    {
        private readonly IImagingRequestService _imagingRequestService;

        public ImagingRequestsController(IImagingRequestService imagingRequestService)
        {
            _imagingRequestService = imagingRequestService;
        }

        /// <summary>
        /// Returns Pending and In Progress imaging requests for the technician queue (UC-55, BR-081).
        /// </summary>
        [Authorize(Roles = RoleConstants.DentalImagingTechnicianRole)]
        [HttpGet("imaging-requests/queue")]
        public async Task<ActionResult<ApiResponse<List<ImagingRequestQueueResponse>>>> GetQueueAsync(
            CancellationToken cancellationToken)
        {
            var queue = await _imagingRequestService.GetQueueAsync(cancellationToken);
            var message = queue.Count == 0
                ? ErrorConstants.ImagingRequestMessage.QueueEmpty
                : "Success";

            return Ok(ApiResponse<List<ImagingRequestQueueResponse>>.SuccessResult(queue, message));
        }

        /// <summary>
        /// Returns the imaging requests of one examination for the examining doctor (UC-82).
        /// </summary>
        [Authorize(Roles = RoleConstants.DoctorRole)]
        [HttpGet("examinations/{examinationId:long}/imaging-requests")]
        public async Task<ActionResult<ApiResponse<List<ImagingRequestResponse>>>> GetByExaminationAsync(
            long examinationId,
            CancellationToken cancellationToken)
        {
            var requests = await _imagingRequestService.GetByExaminationAsync(
                CurrentUserId ?? string.Empty,
                examinationId,
                cancellationToken);

            return Ok(ApiResponse<List<ImagingRequestResponse>>.SuccessResult(requests));
        }

        /// <summary>
        /// Returns one imaging request for the doctor who created it (UC-82).
        /// </summary>
        [Authorize(Roles = RoleConstants.DoctorRole)]
        [HttpGet("imaging-requests/{id:long}")]
        public async Task<ActionResult<ApiResponse<ImagingRequestResponse>>> GetByIdAsync(
            long id,
            CancellationToken cancellationToken)
        {
            var request = await _imagingRequestService.GetByIdAsync(
                CurrentUserId ?? string.Empty,
                id,
                cancellationToken);

            return Ok(ApiResponse<ImagingRequestResponse>.SuccessResult(request));
        }

        /// <summary>
        /// Cancels a Pending imaging request and stores the doctor's reason (UC-82).
        /// </summary>
        [Authorize(Roles = RoleConstants.DoctorRole)]
        [HttpPost("imaging-requests/{id:long}/cancel")]
        public async Task<ActionResult<ApiResponse<ImagingRequestResponse>>> CancelAsync(
            long id,
            [FromBody] CancelImagingRequest request,
            CancellationToken cancellationToken)
        {
            var cancelled = await _imagingRequestService.CancelAsync(
                CurrentUserId ?? string.Empty,
                id,
                request,
                cancellationToken);

            return Ok(ApiResponse<ImagingRequestResponse>.SuccessResult(
                cancelled,
                ErrorConstants.ImagingRequestMessage.RequestCancelled));
        }

        /// <summary>
        /// Creates a Pending imaging request for an in-progress examination and notifies active imaging technicians (UC-82).
        /// </summary>
        [Authorize(Roles = RoleConstants.DoctorRole)]
        [HttpPost("examinations/{examinationId:long}/imaging-requests")]
        public async Task<ActionResult<ApiResponse<ImagingRequestResponse>>> CreateAsync(
            long examinationId,
            [FromBody] CreateImagingRequest request,
            CancellationToken cancellationToken)
        {
            var created = await _imagingRequestService.CreateAsync(
                CurrentUserId ?? string.Empty,
                examinationId,
                request,
                cancellationToken);

            return Ok(ApiResponse<ImagingRequestResponse>.SuccessResult(
                created,
                ErrorConstants.ImagingRequestMessage.RequestSubmitted));
        }
    }
}
