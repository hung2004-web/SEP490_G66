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
    public class InstallmentsController : BaseApiController
    {
        private readonly IInstallmentService _installmentService;

        public InstallmentsController(IInstallmentService installmentService)
        {
            _installmentService = installmentService;
        }

        /// <summary>
        /// Lists installment periods that are due or overdue as of clinic today.
        /// </summary>
        [HttpGet("due")]
        [Authorize(Roles = RoleConstants.ReceptionistRole)]
        public async Task<ActionResult<ApiResponse<IReadOnlyList<InstallmentPeriodResponse>>>> GetDueAsync(
            CancellationToken cancellationToken)
        {
            var periods = await _installmentService.GetDuePeriodsAsync(cancellationToken);
            return Ok(ApiResponse<IReadOnlyList<InstallmentPeriodResponse>>.SuccessResult(periods));
        }
    }
}
