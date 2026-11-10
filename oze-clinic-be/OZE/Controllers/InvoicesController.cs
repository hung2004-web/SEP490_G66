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
        private readonly IPaymentService _paymentService;
        private readonly IInstallmentService _installmentService;

        public InvoicesController(
            IInvoiceService invoiceService,
            IPaymentService paymentService,
            IInstallmentService installmentService)
        {
            _invoiceService = invoiceService;
            _paymentService = paymentService;
            _installmentService = installmentService;
        }

        /// <summary>
        /// Staff see every invoice (null owner). Patients are limited to their own.
        /// </summary>
        private string? OwnerRestriction =>
            IsInRole(RoleConstants.ReceptionistRole) || IsInRole(RoleConstants.ClinicManagerRole)
                ? null
                : CurrentUserId ?? string.Empty;

        /// <summary>
        /// Creates an unpaid invoice. Receptionist only (AD-6).
        /// </summary>
        [HttpPost]
        [Authorize(Roles = RoleConstants.ReceptionistRole)]
        public async Task<ActionResult<ApiResponse<InvoiceResponse>>> CreateAsync(
            [FromBody] CreateInvoiceRequest request,
            CancellationToken cancellationToken)
        {
            var invoice = await _invoiceService.CreateAsync(CurrentUserId ?? string.Empty, request, cancellationToken);
            return Ok(ApiResponse<InvoiceResponse>.SuccessResult(invoice, ErrorConstants.InvoiceMessage.InvoiceCreated));
        }

        [HttpGet]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<PagedResult<InvoiceSummaryResponse>>>> GetPagedAsync(
            [FromQuery] InvoiceQueryParameters parameters,
            CancellationToken cancellationToken)
        {
            var result = await _invoiceService.GetPagedAsync(parameters, cancellationToken);
            return Ok(ApiResponse<PagedResult<InvoiceSummaryResponse>>.SuccessResult(result));
        }

        [HttpGet("my")]
        [Authorize(Roles = RoleConstants.PatientRole)]
        public async Task<ActionResult<ApiResponse<PagedResult<InvoiceSummaryResponse>>>> GetMyInvoicesAsync(
            [FromQuery] InvoiceQueryParameters parameters,
            CancellationToken cancellationToken)
        {
            var result = await _invoiceService.GetMyInvoicesAsync(parameters, CurrentUserId ?? string.Empty, cancellationToken);
            return Ok(ApiResponse<PagedResult<InvoiceSummaryResponse>>.SuccessResult(result));
        }

        [HttpGet("{id:long}")]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole},{RoleConstants.PatientRole}")]
        public async Task<ActionResult<ApiResponse<InvoiceResponse>>> GetByIdAsync(
            [FromRoute] long id,
            CancellationToken cancellationToken)
        {
            var invoice = await _invoiceService.GetByIdAsync(id, OwnerRestriction, cancellationToken);
            return Ok(ApiResponse<InvoiceResponse>.SuccessResult(invoice));
        }

        [HttpPut("{id:long}")]
        [Authorize(Roles = RoleConstants.ReceptionistRole)]
        public async Task<ActionResult<ApiResponse<InvoiceResponse>>> UpdateAsync(
            [FromRoute] long id,
            [FromBody] UpdateInvoiceRequest request,
            CancellationToken cancellationToken)
        {
            var invoice = await _invoiceService.UpdateAsync(id, CurrentUserId ?? string.Empty, request, cancellationToken);
            return Ok(ApiResponse<InvoiceResponse>.SuccessResult(invoice, ErrorConstants.InvoiceMessage.InvoiceUpdated));
        }

        [HttpPost("{id:long}/cancel")]
        [Authorize(Roles = RoleConstants.ReceptionistRole)]
        public async Task<ActionResult<ApiResponse<InvoiceResponse>>> CancelAsync(
            [FromRoute] long id,
            CancellationToken cancellationToken)
        {
            var invoice = await _invoiceService.CancelAsync(id, CurrentUserId ?? string.Empty, cancellationToken);
            return Ok(ApiResponse<InvoiceResponse>.SuccessResult(invoice, ErrorConstants.InvoiceMessage.InvoiceCancelled));
        }

        /// <summary>
        /// Records a payment on an invoice. CASH is confirmed immediately; BANK/QR stay pending.
        /// </summary>
        [HttpPost("{id:long}/payments")]
        [Authorize(Roles = RoleConstants.ReceptionistRole)]
        public async Task<ActionResult<ApiResponse<PaymentResponse>>> RecordPaymentAsync(
            [FromRoute] long id,
            [FromBody] RecordPaymentRequest request,
            CancellationToken cancellationToken)
        {
            var payment = await _paymentService.RecordAsync(id, CurrentUserId ?? string.Empty, request, cancellationToken);
            return Ok(ApiResponse<PaymentResponse>.SuccessResult(payment, ErrorConstants.PaymentMessage.PaymentRecorded));
        }

        [HttpPost("{id:long}/installment-plan")]
        [Authorize(Roles = RoleConstants.ReceptionistRole)]
        public async Task<ActionResult<ApiResponse<InstallmentPlanResponse>>> CreateInstallmentPlanAsync(
            [FromRoute] long id,
            [FromBody] CreateInstallmentPlanRequest request,
            CancellationToken cancellationToken)
        {
            var plan = await _installmentService.CreatePlanAsync(id, CurrentUserId ?? string.Empty, request, cancellationToken);
            return Ok(ApiResponse<InstallmentPlanResponse>.SuccessResult(plan, ErrorConstants.InstallmentMessage.PlanCreated));
        }

        [HttpGet("{id:long}/installment-plan")]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole},{RoleConstants.PatientRole}")]
        public async Task<ActionResult<ApiResponse<InstallmentPlanResponse>>> GetInstallmentPlanAsync(
            [FromRoute] long id,
            CancellationToken cancellationToken)
        {
            var plan = await _installmentService.GetPlanByInvoiceAsync(id, OwnerRestriction, cancellationToken);
            return Ok(ApiResponse<InstallmentPlanResponse>.SuccessResult(plan));
        }
    }
}


