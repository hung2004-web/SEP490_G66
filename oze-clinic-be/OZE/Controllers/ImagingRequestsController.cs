using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Controllers
{
    [ApiController]
    [Authorize(Roles = RoleConstants.DoctorRole)]
    [Route("api")]
    public class ImagingRequestsController : BaseApiController
    {
        private readonly IImagingRequestService _imagingRequestService;

        public ImagingRequestsController(IImagingRequestService imagingRequestService)
        {
            _imagingRequestService = imagingRequestService;
        }

        /// <summary>
        /// Creates a Pending imaging request for an in-progress examination and notifies active imaging technicians (UC-82).
        /// </summary>
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
