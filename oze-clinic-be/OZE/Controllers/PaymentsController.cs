using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentsController : BaseApiController
    {
        private readonly IPaymentService _paymentService;

        public PaymentsController(IPaymentService paymentService)
        {
            _paymentService = paymentService;
        }

        [HttpPost("{id:long}/confirm")]
        [Authorize(Roles = RoleConstants.ReceptionistRole)]
        public async Task<ActionResult<ApiResponse<PaymentResponse>>> ConfirmAsync(
            [FromRoute] long id,
            CancellationToken cancellationToken)
        {
            var payment = await _paymentService.ConfirmAsync(id, CurrentUserId ?? string.Empty, cancellationToken);
            return Ok(ApiResponse<PaymentResponse>.SuccessResult(payment, ErrorConstants.PaymentMessage.PaymentConfirmed));
        }

        [HttpPost("{id:long}/void")]
        [Authorize(Roles = RoleConstants.ReceptionistRole)]
        public async Task<ActionResult<ApiResponse<PaymentResponse>>> VoidAsync(
            [FromRoute] long id,
            CancellationToken cancellationToken)
        {
            var payment = await _paymentService.VoidAsync(id, CurrentUserId ?? string.Empty, cancellationToken);
            return Ok(ApiResponse<PaymentResponse>.SuccessResult(payment, ErrorConstants.PaymentMessage.PaymentVoided));
        }
    }
}
