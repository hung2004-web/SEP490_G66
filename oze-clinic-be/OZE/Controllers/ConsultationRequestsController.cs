using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Controllers
{
    [Route("api/consultation-requests")]
    public class ConsultationRequestsController : BaseApiController
    {
        private readonly IConsultationService _consultationService;

        public ConsultationRequestsController(IConsultationService consultationService)
        {
            _consultationService = consultationService;
        }

        /// <summary>
        /// Public "Đăng ký tư vấn" form: name and phone, the clinic calls back. Refused if the same phone sent one in the last 10 minutes.
        /// </summary>
        [HttpPost]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<ConsultationResponse>>> CreateAsync([FromBody] CreateConsultationRequest request, CancellationToken cancellationToken)
        {
            var created = await _consultationService.CreateAsync(request, cancellationToken);
            return Ok(ApiResponse<ConsultationResponse>.SuccessResult(created, ErrorConstants.ConsultationMessage.Created));
        }

        [HttpGet]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<PagedResult<ConsultationResponse>>>> GetAsync([FromQuery] ConsultationQuery query, CancellationToken cancellationToken)
        {
            var page = await _consultationService.GetPagedAsync(query, cancellationToken);
            return Ok(ApiResponse<PagedResult<ConsultationResponse>>.SuccessResult(page));
        }

        /// <summary>
        /// Record the call: Contacted, Booked or Closed, with a note.
        /// </summary>
        [HttpPost("{id:long}/handle")]
        [Authorize(Roles = RoleConstants.ReceptionistRole)]
        public async Task<ActionResult<ApiResponse<ConsultationResponse>>> HandleAsync(long id, [FromBody] HandleConsultationRequest request, CancellationToken cancellationToken)
        {
            var handled = await _consultationService.HandleAsync(id, CurrentUserId!, request, cancellationToken);
            return Ok(ApiResponse<ConsultationResponse>.SuccessResult(handled, ErrorConstants.ConsultationMessage.Handled));
        }
    }
}
