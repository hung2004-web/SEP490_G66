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
    public class InvoicesController : BaseApiController
    {
        private readonly IInvoiceService _invoiceService;

        public InvoicesController(IInvoiceService invoiceService)
        {
            _invoiceService = invoiceService;
        }

        /// <summary>
        /// Creates an unpaid invoice with line items for a patient (optionally linked to an appointment / treatment plan).
        /// </summary>
        [HttpPost]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<InvoiceResponse>>> CreateAsync(
            [FromBody] CreateInvoiceRequest request,
            CancellationToken cancellationToken)
        {
            var invoice = await _invoiceService.CreateAsync(CurrentUserId ?? string.Empty, request, cancellationToken);
            return Ok(ApiResponse<InvoiceResponse>.SuccessResult(invoice, ErrorConstants.InvoiceMessage.InvoiceCreated));
        }
    }
}
