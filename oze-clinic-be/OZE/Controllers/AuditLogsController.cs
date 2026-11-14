using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Controllers
{
    /// <summary>
    /// The audit log, read only, for the clinic manager. Entries are never edited or deleted.
    /// </summary>
    [Route("api/audit-logs")]
    [Authorize(Roles = RoleConstants.ClinicManagerRole)]
    public class AuditLogsController : BaseApiController
    {
        private readonly IAuditLogQueryService _auditLogQueryService;

        public AuditLogsController(IAuditLogQueryService auditLogQueryService)
        {
            _auditLogQueryService = auditLogQueryService;
        }

        /// <summary>
        /// Audit log entries, newest first, filtered by date, person, action, record or keyword.
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<ApiResponse<AuditLogListResponse>>> GetPagedAsync(
            [FromQuery] AuditLogQueryParameters query,
            CancellationToken cancellationToken)
        {
            var result = await _auditLogQueryService.GetPagedAsync(query, cancellationToken);
            return Ok(ApiResponse<AuditLogListResponse>.SuccessResult(result));
        }

        /// <summary>
        /// One audit log entry with the values before and after.
        /// </summary>
        [HttpGet("{id:long}")]
        public async Task<ActionResult<ApiResponse<AuditLogDetailResponse>>> GetByIdAsync([FromRoute] long id, CancellationToken cancellationToken)
        {
            var result = await _auditLogQueryService.GetByIdAsync(id, cancellationToken);
            return Ok(ApiResponse<AuditLogDetailResponse>.SuccessResult(result));
        }
    }
}
