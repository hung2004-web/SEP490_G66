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
    public class ServicesController : ControllerBase
    {
        private readonly IClinicServiceService _clinicService;

        public ServicesController(IClinicServiceService clinicService)
        {
            _clinicService = clinicService;
        }

        /// <summary>
        /// Retrieves a paginated list of clinic services with optional filtering, search, and sorting.
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<PagedResult<ServiceDto>>>> GetServicesAsync(
            [FromQuery] ServiceQueryParameters query,
            CancellationToken cancellationToken)
        {
            var result = await _clinicService.GetServicesAsync(query, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves all active clinic services (useful for booking forms and dropdown menus).
        /// </summary>
        [HttpGet("active")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<IReadOnlyList<ServiceDto>>>> GetActiveServicesAsync(
            CancellationToken cancellationToken)
        {
            var result = await _clinicService.GetActiveServicesAsync(cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves a single clinic service by its ID.
        /// </summary>
        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<ServiceDto>>> GetServiceByIdAsync(
            [FromRoute] int id,
            CancellationToken cancellationToken)
        {
            var result = await _clinicService.GetServiceByIdAsync(id, cancellationToken);
            if (!result.Success)
            {
                return NotFound(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Retrieves a single clinic service by its unique service code.
        /// </summary>
        [HttpGet("by-code/{code}")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<ServiceDto>>> GetServiceByCodeAsync(
            [FromRoute] string code,
            CancellationToken cancellationToken)
        {
            var result = await _clinicService.GetServiceByCodeAsync(code, cancellationToken);
            if (!result.Success)
            {
                return NotFound(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Creates a new clinic service. Requires ClinicManager role.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = RoleConstants.ClinicManagerRole)]
        public async Task<ActionResult<ApiResponse<ServiceDto>>> CreateServiceAsync(
            [FromBody] CreateServiceRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _clinicService.CreateServiceAsync(request, cancellationToken);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return CreatedAtAction(
                nameof(GetServiceByIdAsync),
                new { id = result.Data!.Id },
                result);
        }

        /// <summary>
        /// Updates an existing clinic service. Requires ClinicManager role.
        /// </summary>
        [HttpPut("{id:int}")]
        [Authorize(Roles = RoleConstants.ClinicManagerRole)]
        public async Task<ActionResult<ApiResponse<ServiceDto>>> UpdateServiceAsync(
            [FromRoute] int id,
            [FromBody] UpdateServiceRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _clinicService.UpdateServiceAsync(id, request, cancellationToken);
            if (!result.Success)
            {
                if (result.Message == ErrorConstants.ServiceMessage.ServiceNotFound)
                {
                    return NotFound(result);
                }
                return BadRequest(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Toggles or updates the active status of a clinic service. Requires ClinicManager role.
        /// </summary>
        [HttpPatch("{id:int}/status")]
        [Authorize(Roles = RoleConstants.ClinicManagerRole)]
        public async Task<ActionResult<ApiResponse<ServiceDto>>> ToggleStatusAsync(
            [FromRoute] int id,
            [FromBody] ToggleServiceStatusRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _clinicService.ToggleServiceStatusAsync(id, request.IsActive, cancellationToken);
            if (!result.Success)
            {
                if (result.Message == ErrorConstants.ServiceMessage.ServiceNotFound)
                {
                    return NotFound(result);
                }
                return BadRequest(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Deletes a clinic service. If the service is referenced by invoices or treatment plans, deletion is rejected. Requires ClinicManager role.
        /// </summary>
        [HttpDelete("{id:int}")]
        [Authorize(Roles = RoleConstants.ClinicManagerRole)]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteServiceAsync(
            [FromRoute] int id,
            CancellationToken cancellationToken)
        {
            var result = await _clinicService.DeleteServiceAsync(id, cancellationToken);
            if (!result.Success)
            {
                if (result.Message == ErrorConstants.ServiceMessage.ServiceNotFound)
                {
                    return NotFound(result);
                }
                return BadRequest(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Lists every variant of a service, active and inactive. Requires ClinicManager role.
        /// </summary>
        [HttpGet("{serviceId:int}/variants")]
        [Authorize(Roles = RoleConstants.ClinicManagerRole)]
        public async Task<ActionResult<ApiResponse<IReadOnlyList<ServiceVariantDto>>>> GetVariantsAsync(
            [FromRoute] int serviceId,
            CancellationToken cancellationToken)
        {
            var result = await _clinicService.GetVariantsAsync(serviceId, cancellationToken);
            return result.Success ? Ok(result) : NotFound(result);
        }

        /// <summary>
        /// Adds a variant to a service. Requires ClinicManager role.
        /// </summary>
        [HttpPost("{serviceId:int}/variants")]
        [Authorize(Roles = RoleConstants.ClinicManagerRole)]
        public async Task<ActionResult<ApiResponse<ServiceVariantDto>>> CreateVariantAsync(
            [FromRoute] int serviceId,
            [FromBody] SaveServiceVariantRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _clinicService.CreateVariantAsync(serviceId, request, cancellationToken);
            if (!result.Success)
            {
                return VariantFailure(result);
            }

            return StatusCode(StatusCodes.Status201Created, result);
        }

        /// <summary>
        /// Updates a variant of a service. Requires ClinicManager role.
        /// </summary>
        [HttpPut("{serviceId:int}/variants/{variantId:int}")]
        [Authorize(Roles = RoleConstants.ClinicManagerRole)]
        public async Task<ActionResult<ApiResponse<ServiceVariantDto>>> UpdateVariantAsync(
            [FromRoute] int serviceId,
            [FromRoute] int variantId,
            [FromBody] SaveServiceVariantRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _clinicService.UpdateVariantAsync(serviceId, variantId, request, cancellationToken);
            return result.Success ? Ok(result) : VariantFailure(result);
        }

        /// <summary>
        /// Turns a variant on or off. Requires ClinicManager role.
        /// </summary>
        [HttpPatch("{serviceId:int}/variants/{variantId:int}/status")]
        [Authorize(Roles = RoleConstants.ClinicManagerRole)]
        public async Task<ActionResult<ApiResponse<ServiceVariantDto>>> ToggleVariantStatusAsync(
            [FromRoute] int serviceId,
            [FromRoute] int variantId,
            [FromBody] ToggleServiceStatusRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _clinicService.ToggleVariantStatusAsync(serviceId, variantId, request.IsActive, cancellationToken);
            return result.Success ? Ok(result) : VariantFailure(result);
        }

        /// <summary>
        /// Deletes a variant that was never booked. Requires ClinicManager role.
        /// </summary>
        [HttpDelete("{serviceId:int}/variants/{variantId:int}")]
        [Authorize(Roles = RoleConstants.ClinicManagerRole)]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteVariantAsync(
            [FromRoute] int serviceId,
            [FromRoute] int variantId,
            CancellationToken cancellationToken)
        {
            var result = await _clinicService.DeleteVariantAsync(serviceId, variantId, cancellationToken);
            return result.Success ? Ok(result) : VariantFailure(result);
        }

        // Not found for a missing service or variant, bad request for everything else
        private ObjectResult VariantFailure<T>(ApiResponse<T> result)
        {
            return result.Message == ErrorConstants.ServiceMessage.ServiceNotFound
                || result.Message == ErrorConstants.ServiceVariantMessage.VariantNotFound
                ? NotFound(result)
                : BadRequest(result);
        }
    }
}
