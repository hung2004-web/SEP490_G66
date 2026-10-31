using System.Security.Claims;
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
    [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.DoctorRole},{RoleConstants.ClinicManagerRole}")]
    public class PatientsController : BaseApiController
    {
        private readonly IPatientService _patientService;

        public PatientsController(IPatientService patientService)
        {
            _patientService = patientService;
        }

        /// <summary>
        /// Retrieves a paginated list of patients with search, filtering, and sorting.
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<ApiResponse<PagedResult<PatientDto>>>> GetPatientsAsync(
            [FromQuery] PatientQueryParameters query,
            CancellationToken cancellationToken)
        {
            var result = await _patientService.GetPatientsAsync(query, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves detailed information of a patient by ID, including their medical profile.
        /// </summary>
        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<PatientDetailDto>>> GetPatientByIdAsync(
            [FromRoute] int id,
            CancellationToken cancellationToken)
        {
            var result = await _patientService.GetPatientByIdAsync(id, cancellationToken);
            if (!result.Success)
            {
                return NotFound(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Retrieves detailed information of a patient by their unique patient code.
        /// </summary>
        [HttpGet("by-code/{code}")]
        public async Task<ActionResult<ApiResponse<PatientDetailDto>>> GetPatientByCodeAsync(
            [FromRoute] string code,
            CancellationToken cancellationToken)
        {
            var result = await _patientService.GetPatientByCodeAsync(code, cancellationToken);
            if (!result.Success)
            {
                return NotFound(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Creates a new patient record (e.g. for walk-in registration).
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<ApiResponse<PatientDto>>> CreatePatientAsync(
            [FromBody] CreatePatientRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _patientService.CreatePatientAsync(request, cancellationToken);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return CreatedAtAction(
                nameof(GetPatientByIdAsync),
                new { id = result.Data!.Id },
                result);
        }

        /// <summary>
        /// Soft-deletes a patient record.
        /// </summary>
        [HttpDelete("{id:int}")]
        [Authorize(Roles = $"{RoleConstants.ClinicManagerRole},{RoleConstants.ReceptionistRole}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeletePatientAsync(
            [FromRoute] int id,
            CancellationToken cancellationToken)
        {
            var result = await _patientService.DeletePatientAsync(id, cancellationToken);
            if (!result.Success)
            {
                if (result.Message == ErrorConstants.PatientMessage.PatientNotFound)
                {
                    return NotFound(result);
                }
                return BadRequest(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Adds a medical profile entry (allergy, condition, medical history, medication) for a patient.
        /// </summary>
        [HttpPost("{id:int}/medical-profiles")]
        public async Task<ActionResult<ApiResponse<PatientMedicalProfileDto>>> AddMedicalProfileAsync(
            [FromRoute] int id,
            [FromBody] CreateMedicalProfileRequest request,
            CancellationToken cancellationToken)
        {
            var userId = CurrentUserId;
            var result = await _patientService.AddMedicalProfileAsync(id, request, userId, cancellationToken);
            if (!result.Success)
            {
                if (result.Message == ErrorConstants.PatientMessage.PatientNotFound)
                {
                    return NotFound(result);
                }
                return BadRequest(result);
            }

            return Ok(result);
        }
    }
}
