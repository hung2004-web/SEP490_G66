using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Controllers
{
    // Shift hand-over of the receptionist's cash drawer
    [Authorize]
    [Route("api/cash-sessions")]
    public class CashSessionsController : BaseApiController
    {
        private const string ReceptionOrManager = $"{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole}";

        private readonly ICashSessionService _cashSessionService;

        public CashSessionsController(ICashSessionService cashSessionService)
        {
            _cashSessionService = cashSessionService;
        }

        /// <summary>
        /// The receptionist's open session with live totals; data is null when no session is open.
        /// </summary>
        [HttpGet("current")]
        [Authorize(Roles = RoleConstants.ReceptionistRole)]
        public async Task<ActionResult<ApiResponse<CashSessionResponse?>>> GetCurrentAsync(CancellationToken cancellationToken)
        {
            var session = await _cashSessionService.GetCurrentAsync(CurrentUserId!, cancellationToken);
            return Ok(ApiResponse<CashSessionResponse?>.SuccessResult(session));
        }

        [HttpPost("open")]
        [Authorize(Roles = RoleConstants.ReceptionistRole)]
        public async Task<ActionResult<ApiResponse<CashSessionResponse>>> OpenAsync(
            [FromBody] OpenCashSessionRequest request,
            CancellationToken cancellationToken)
        {
            var session = await _cashSessionService.OpenAsync(CurrentUserId!, request, cancellationToken);
            return Ok(ApiResponse<CashSessionResponse>.SuccessResult(session, ErrorConstants.CashSessionMessage.Opened));
        }

        [HttpPost("current/expenses")]
        [Authorize(Roles = RoleConstants.ReceptionistRole)]
        public async Task<ActionResult<ApiResponse<CashSessionResponse>>> AddExpenseAsync(
            [FromBody] AddCashExpenseRequest request,
            CancellationToken cancellationToken)
        {
            var session = await _cashSessionService.AddExpenseAsync(CurrentUserId!, request, cancellationToken);
            return Ok(ApiResponse<CashSessionResponse>.SuccessResult(session, ErrorConstants.CashSessionMessage.ExpenseAdded));
        }

        [HttpDelete("current/expenses/{expenseId:long}")]
        [Authorize(Roles = RoleConstants.ReceptionistRole)]
        public async Task<ActionResult<ApiResponse<CashSessionResponse>>> RemoveExpenseAsync(long expenseId, CancellationToken cancellationToken)
        {
            var session = await _cashSessionService.RemoveExpenseAsync(CurrentUserId!, expenseId, cancellationToken);
            return Ok(ApiResponse<CashSessionResponse>.SuccessResult(session, ErrorConstants.CashSessionMessage.ExpenseRemoved));
        }

        /// <summary>
        /// Count the drawer and hand over. Notes are required when the count differs from the expected cash.
        /// </summary>
        [HttpPost("current/close")]
        [Authorize(Roles = RoleConstants.ReceptionistRole)]
        public async Task<ActionResult<ApiResponse<CashSessionResponse>>> CloseAsync(
            [FromBody] CloseCashSessionRequest request,
            CancellationToken cancellationToken)
        {
            var session = await _cashSessionService.CloseAsync(CurrentUserId!, request, cancellationToken);
            return Ok(ApiResponse<CashSessionResponse>.SuccessResult(session, ErrorConstants.CashSessionMessage.Closed));
        }

        [HttpGet("handover-candidates")]
        [Authorize(Roles = RoleConstants.ReceptionistRole)]
        public async Task<ActionResult<ApiResponse<List<StaffOption>>>> GetHandoverCandidatesAsync(CancellationToken cancellationToken)
        {
            var candidates = await _cashSessionService.GetHandoverCandidatesAsync(CurrentUserId!, cancellationToken);
            return Ok(ApiResponse<List<StaffOption>>.SuccessResult(candidates));
        }

        /// <summary>
        /// Past sessions. A receptionist sees only their own; the manager sees all or filters by OpenedByUserId.
        /// </summary>
        [HttpGet]
        [Authorize(Roles = ReceptionOrManager)]
        public async Task<ActionResult<ApiResponse<PagedResult<CashSessionSummaryResponse>>>> GetPagedAsync(
            [FromQuery] CashSessionQuery query,
            CancellationToken cancellationToken)
        {
            var page = await _cashSessionService.GetPagedAsync(
                CurrentUserId!, IsInRole(RoleConstants.ClinicManagerRole), query, cancellationToken);
            return Ok(ApiResponse<PagedResult<CashSessionSummaryResponse>>.SuccessResult(page));
        }

        [HttpGet("{id:long}")]
        [Authorize(Roles = ReceptionOrManager)]
        public async Task<ActionResult<ApiResponse<CashSessionResponse>>> GetByIdAsync(long id, CancellationToken cancellationToken)
        {
            var session = await _cashSessionService.GetByIdAsync(
                CurrentUserId!, IsInRole(RoleConstants.ClinicManagerRole), id, cancellationToken);
            return Ok(ApiResponse<CashSessionResponse>.SuccessResult(session));
        }
    }
}
