using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Controllers
{
    [ApiController]
    [AllowAnonymous]
    [Route("api/[controller]")]
    public class DoctorsController : ControllerBase
    {
        private readonly IHomeService _homeService;

        public DoctorsController(IHomeService homeService)
        {
            _homeService = homeService;
        }

        /// <summary>
        /// Retrieves a paginated, searchable list of active doctors for guests/visitors.
        /// Matches Report 4 SDS Section 3.3 (View Doctor Information) and Report 3 SRS UC-03, FR 1.3, BR-110, BR-112.
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<ApiResponse<PagedResult<HomeDoctorResponse>>>> GetDoctorsAsync(
            [FromQuery] DoctorQueryParameters query,
            CancellationToken cancellationToken)
        {
            var result = await _homeService.GetDoctorsAsync(query, cancellationToken);
            if (result.TotalCount == 0)
            {
                // Returns MSG02: "No Data." per UC-03 Alternative Flow (Step 3)
                return Ok(ApiResponse<PagedResult<HomeDoctorResponse>>.SuccessResult(result, ErrorConstants.Common.NoData));
            }

            return Ok(ApiResponse<PagedResult<HomeDoctorResponse>>.SuccessResult(result));
        }

        /// <summary>
        /// Retrieves public details of a specific active doctor by ID.
        /// Matches Report 4 SDS Section 3.3 (View Doctor Information) and Report 3 SRS UC-03, FR 1.3.
        /// </summary>
        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<HomeDoctorResponse>>> GetDoctorByIdAsync(
            [FromRoute] int id,
            CancellationToken cancellationToken)
        {
            var doctor = await _homeService.GetDoctorByIdAsync(id, cancellationToken);
            if (doctor == null)
            {
                return NotFound(ApiResponse<HomeDoctorResponse>.FailureResult("Doctor not found."));
            }

            return Ok(ApiResponse<HomeDoctorResponse>.SuccessResult(doctor));
        }
    }
}
