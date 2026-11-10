using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Controllers
{
    [ApiController]
    [Route("api/invoice-reports")]
    public class InvoiceReportsController : BaseApiController
    {
        private readonly IInvoiceReportService _invoiceReportService;

        public InvoiceReportsController(IInvoiceReportService invoiceReportService)
        {
            _invoiceReportService = invoiceReportService;
        }

        /// <summary>
        /// Receptionist day aggregation (FR-PAY-20): new invoices, collections by method, outstanding, installment due/overdue.
        /// </summary>
        [HttpGet("daily")]
        [Authorize(Roles = RoleConstants.ReceptionistRole)]
        public async Task<ActionResult<ApiResponse<InvoiceReportResponse>>> GetDailyAsync(
            [FromQuery] DailyInvoiceReportQuery query,
            CancellationToken cancellationToken)
        {
            var report = await _invoiceReportService.GetDailyAsync(query, cancellationToken);
            return Ok(ApiResponse<InvoiceReportResponse>.SuccessResult(report, ErrorConstants.ReportMessage.DailyRetrieved));
        }

        /// <summary>
        /// Manager overview over a clinic-day range: same metrics as daily for [from,to], outstanding/due as of clinic today.
        /// </summary>
        [HttpGet("overview")]
        [Authorize(Roles = RoleConstants.ClinicManagerRole)]
        public async Task<ActionResult<ApiResponse<InvoiceReportResponse>>> GetOverviewAsync(
            [FromQuery] OverviewInvoiceReportQuery query,
            CancellationToken cancellationToken)
        {
            var report = await _invoiceReportService.GetOverviewAsync(query, cancellationToken);
            return Ok(ApiResponse<InvoiceReportResponse>.SuccessResult(report, ErrorConstants.ReportMessage.OverviewRetrieved));
        }
    }
}
