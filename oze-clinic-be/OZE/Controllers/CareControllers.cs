using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Controllers
{
    // Call results about a follow-up visit (customer care, receptionist only)
    [Authorize]
    [Route("api/examinations")]
    public class FollowUpContactsController : BaseApiController
    {
        private readonly IFollowUpCareService _careService;

        public FollowUpContactsController(IFollowUpCareService careService)
        {
            _careService = careService;
        }

        /// <summary>
        /// Record one call: Booked, CallBack (with callBackDate), Unreachable or Declined. Declined stops further reminders.
        /// </summary>
        [HttpPost("{id:long}/follow-up/contacts")]
        [Authorize(Roles = RoleConstants.ReceptionistRole)]
        public async Task<ActionResult<ApiResponse<FollowUpContactResponse>>> RecordAsync(
            long id,
            [FromBody] RecordFollowUpContactRequest request,
            CancellationToken cancellationToken)
        {
            var contact = await _careService.RecordContactAsync(id, CurrentUserId!, request, cancellationToken);
            return Ok(ApiResponse<FollowUpContactResponse>.SuccessResult(contact, ErrorConstants.CareMessage.ContactRecorded));
        }

        [HttpGet("{id:long}/follow-up/contacts")]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.DoctorRole}")]
        public async Task<ActionResult<ApiResponse<List<FollowUpContactResponse>>>> GetAsync(long id, CancellationToken cancellationToken)
        {
            var contacts = await _careService.GetContactsAsync(id, cancellationToken);
            return Ok(ApiResponse<List<FollowUpContactResponse>>.SuccessResult(contacts));
        }
    }

    // Patient debts and payment reminders
    [Authorize]
    [Route("api/debts")]
    public class DebtsController : BaseApiController
    {
        private readonly IDebtService _debtService;

        public DebtsController(IDebtService debtService)
        {
            _debtService = debtService;
        }

        /// <summary>
        /// Every invoice still owing money: remaining amount, next or overdue installment, reminders sent. Overdue first.
        /// </summary>
        [HttpGet]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<DebtListResponse>>> GetAsync([FromQuery] DebtQuery query, CancellationToken cancellationToken)
        {
            var debts = await _debtService.GetDebtsAsync(query, cancellationToken);
            return Ok(ApiResponse<DebtListResponse>.SuccessResult(debts));
        }

        /// <summary>
        /// Send a payment reminder by SMS and email. Refused within 4 hours of the last one unless force = true.
        /// </summary>
        [HttpPost("{invoiceId:long}/remind")]
        [Authorize(Roles = RoleConstants.ReceptionistRole)]
        public async Task<ActionResult<ApiResponse<PaymentReminderResponse>>> RemindAsync(
            long invoiceId,
            [FromBody] RemindPaymentRequest? request,
            CancellationToken cancellationToken)
        {
            var reminder = await _debtService.RemindAsync(invoiceId, CurrentUserId!, request ?? new RemindPaymentRequest(), cancellationToken);
            return Ok(ApiResponse<PaymentReminderResponse>.SuccessResult(reminder, ErrorConstants.CareMessage.PaymentReminded));
        }

        [HttpGet("{invoiceId:long}/reminders")]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<List<PaymentReminderResponse>>>> GetRemindersAsync(long invoiceId, CancellationToken cancellationToken)
        {
            var reminders = await _debtService.GetRemindersAsync(invoiceId, cancellationToken);
            return Ok(ApiResponse<List<PaymentReminderResponse>>.SuccessResult(reminders));
        }
    }

    // Payment history: every payment recorded, filtered by day, method, status or patient
    [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole}")]
    [Route("api/payment-history")]
    public class PaymentHistoryController : BaseApiController
    {
        private readonly IDebtService _debtService;

        public PaymentHistoryController(IDebtService debtService)
        {
            _debtService = debtService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<PaymentHistoryResponse>>> GetAsync([FromQuery] PaymentHistoryQuery query, CancellationToken cancellationToken)
        {
            var history = await _debtService.GetPaymentHistoryAsync(query, cancellationToken);
            return Ok(ApiResponse<PaymentHistoryResponse>.SuccessResult(history));
        }
    }

    // End-of-day reconciliation (manager)
    [Authorize(Roles = RoleConstants.ClinicManagerRole)]
    [Route("api/reconciliations")]
    public class ReconciliationsController : BaseApiController
    {
        private readonly IReconciliationService _reconciliationService;

        public ReconciliationsController(IReconciliationService reconciliationService)
        {
            _reconciliationService = reconciliationService;
        }

        [HttpGet("daily")]
        public async Task<ActionResult<ApiResponse<DailyReconciliationResponse>>> GetDailyAsync([FromQuery] DateOnly? date, CancellationToken cancellationToken)
        {
            var report = await _reconciliationService.GetDailyAsync(date, cancellationToken);
            return Ok(ApiResponse<DailyReconciliationResponse>.SuccessResult(report));
        }

        /// <summary>
        /// Close the day. Refused while a drawer of that day is open; notes required when something does not add up.
        /// </summary>
        [HttpPost("daily/{date}/confirm")]
        public async Task<ActionResult<ApiResponse<DailyReconciliationResponse>>> ConfirmAsync(
            DateOnly date,
            [FromBody] ConfirmReconciliationRequest? request,
            CancellationToken cancellationToken)
        {
            var report = await _reconciliationService.ConfirmAsync(date, CurrentUserId!, request ?? new ConfirmReconciliationRequest(), cancellationToken);
            return Ok(ApiResponse<DailyReconciliationResponse>.SuccessResult(report, ErrorConstants.CareMessage.ReconciliationConfirmed));
        }
    }
}
