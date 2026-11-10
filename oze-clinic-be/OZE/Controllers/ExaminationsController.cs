using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Controllers
{
    /// <summary>
    /// What the examining doctor reads and writes during one examination: services, notes and diagnoses.
    /// </summary>
    [ApiController]
    [Authorize(Roles = RoleConstants.DoctorRole)]
    [Route("api")]
    public class ExaminationsController : BaseApiController
    {
        private readonly IExaminationService _examinationService;

        public ExaminationsController(IExaminationService examinationService)
        {
            _examinationService = examinationService;
        }

        // The empty fallback matches no doctor, so a missing user id never reaches someone else's examination
        private string DoctorUserId => CurrentUserId ?? string.Empty;

        [HttpGet("examinations/{id:long}")]
        public async Task<ActionResult<ApiResponse<ExaminationWorkResponse>>> GetAsync(long id, CancellationToken cancellationToken)
        {
            var result = await _examinationService.GetAsync(DoctorUserId, id, cancellationToken);
            return Ok(ApiResponse<ExaminationWorkResponse>.SuccessResult(result));
        }

        [HttpPut("examinations/{id:long}/content")]
        public async Task<ActionResult<ApiResponse<ExaminationWorkResponse>>> UpdateContentAsync(
            long id, [FromBody] UpdateExaminationContentRequest request, CancellationToken cancellationToken)
        {
            var result = await _examinationService.UpdateContentAsync(DoctorUserId, id, request, cancellationToken);
            return Ok(ApiResponse<ExaminationWorkResponse>.SuccessResult(result, "Examination notes saved"));
        }

        [HttpPost("examinations/{id:long}/services")]
        public async Task<ActionResult<ApiResponse<List<ExaminationServiceResponse>>>> AddServiceAsync(
            long id, [FromBody] SaveExaminationServiceRequest request, CancellationToken cancellationToken)
        {
            var result = await _examinationService.AddServiceAsync(DoctorUserId, id, request, cancellationToken);
            return Ok(ApiResponse<List<ExaminationServiceResponse>>.SuccessResult(result, "Service added"));
        }

        [HttpPut("examinations/{id:long}/services/{serviceItemId:long}")]
        public async Task<ActionResult<ApiResponse<List<ExaminationServiceResponse>>>> UpdateServiceAsync(
            long id, long serviceItemId, [FromBody] SaveExaminationServiceRequest request, CancellationToken cancellationToken)
        {
            var result = await _examinationService.UpdateServiceAsync(DoctorUserId, id, serviceItemId, request, cancellationToken);
            return Ok(ApiResponse<List<ExaminationServiceResponse>>.SuccessResult(result, "Service updated"));
        }

        [HttpDelete("examinations/{id:long}/services/{serviceItemId:long}")]
        public async Task<ActionResult<ApiResponse<List<ExaminationServiceResponse>>>> RemoveServiceAsync(
            long id, long serviceItemId, CancellationToken cancellationToken)
        {
            var result = await _examinationService.RemoveServiceAsync(DoctorUserId, id, serviceItemId, cancellationToken);
            return Ok(ApiResponse<List<ExaminationServiceResponse>>.SuccessResult(result, "Service removed"));
        }

        [HttpGet("examinations/{id:long}/dental-chart")]
        public async Task<ActionResult<ApiResponse<List<DentalChartToothResponse>>>> GetDentalChartAsync(long id, CancellationToken cancellationToken)
        {
            var result = await _examinationService.GetDentalChartAsync(DoctorUserId, id, cancellationToken);
            return Ok(ApiResponse<List<DentalChartToothResponse>>.SuccessResult(result));
        }

        [HttpPut("examinations/{id:long}/dental-chart/{toothNumber}")]
        public async Task<ActionResult<ApiResponse<List<DentalChartToothResponse>>>> SetToothAsync(
            long id, string toothNumber, [FromBody] SaveToothRequest request, CancellationToken cancellationToken)
        {
            var result = await _examinationService.SetToothAsync(DoctorUserId, id, toothNumber, request, cancellationToken);
            return Ok(ApiResponse<List<DentalChartToothResponse>>.SuccessResult(result, "Dental chart updated"));
        }

        [HttpDelete("examinations/{id:long}/dental-chart/{toothNumber}")]
        public async Task<ActionResult<ApiResponse<List<DentalChartToothResponse>>>> RemoveToothChangeAsync(
            long id, string toothNumber, CancellationToken cancellationToken)
        {
            var result = await _examinationService.RemoveToothChangeAsync(DoctorUserId, id, toothNumber, cancellationToken);
            return Ok(ApiResponse<List<DentalChartToothResponse>>.SuccessResult(result, "Tooth change removed"));
        }

        [HttpGet("examinations/{id:long}/prescription")]
        public async Task<ActionResult<ApiResponse<PrescriptionResponse>>> GetPrescriptionAsync(long id, CancellationToken cancellationToken)
        {
            var result = await _examinationService.GetPrescriptionAsync(DoctorUserId, id, cancellationToken);
            return Ok(ApiResponse<PrescriptionResponse>.SuccessResult(result));
        }

        [HttpPut("examinations/{id:long}/prescription")]
        public async Task<ActionResult<ApiResponse<PrescriptionResponse>>> SavePrescriptionNotesAsync(
            long id, [FromBody] SavePrescriptionNotesRequest request, CancellationToken cancellationToken)
        {
            var result = await _examinationService.SavePrescriptionNotesAsync(DoctorUserId, id, request, cancellationToken);
            return Ok(ApiResponse<PrescriptionResponse>.SuccessResult(result, "Prescription note saved"));
        }

        [HttpDelete("examinations/{id:long}/prescription")]
        public async Task<ActionResult<ApiResponse<PrescriptionResponse>>> DeletePrescriptionAsync(long id, CancellationToken cancellationToken)
        {
            var result = await _examinationService.DeletePrescriptionAsync(DoctorUserId, id, cancellationToken);
            return Ok(ApiResponse<PrescriptionResponse>.SuccessResult(result, "Prescription deleted"));
        }

        [HttpPost("examinations/{id:long}/prescription/items")]
        public async Task<ActionResult<ApiResponse<PrescriptionResponse>>> AddPrescriptionItemAsync(
            long id, [FromBody] SavePrescriptionItemRequest request, CancellationToken cancellationToken)
        {
            var result = await _examinationService.AddPrescriptionItemAsync(DoctorUserId, id, request, cancellationToken);
            return Ok(ApiResponse<PrescriptionResponse>.SuccessResult(result, "Medication added"));
        }

        [HttpPut("examinations/{id:long}/prescription/items/{itemId:long}")]
        public async Task<ActionResult<ApiResponse<PrescriptionResponse>>> UpdatePrescriptionItemAsync(
            long id, long itemId, [FromBody] SavePrescriptionItemRequest request, CancellationToken cancellationToken)
        {
            var result = await _examinationService.UpdatePrescriptionItemAsync(DoctorUserId, id, itemId, request, cancellationToken);
            return Ok(ApiResponse<PrescriptionResponse>.SuccessResult(result, "Medication updated"));
        }

        [HttpDelete("examinations/{id:long}/prescription/items/{itemId:long}")]
        public async Task<ActionResult<ApiResponse<PrescriptionResponse>>> DeletePrescriptionItemAsync(
            long id, long itemId, CancellationToken cancellationToken)
        {
            var result = await _examinationService.DeletePrescriptionItemAsync(DoctorUserId, id, itemId, cancellationToken);
            return Ok(ApiResponse<PrescriptionResponse>.SuccessResult(result, "Medication removed"));
        }

        [HttpPost("examinations/{id:long}/prescription/finalize")]
        public async Task<ActionResult<ApiResponse<PrescriptionResponse>>> FinalizePrescriptionAsync(long id, CancellationToken cancellationToken)
        {
            var result = await _examinationService.FinalizePrescriptionAsync(DoctorUserId, id, cancellationToken);
            return Ok(ApiResponse<PrescriptionResponse>.SuccessResult(result, "Prescription finalized"));
        }

        [HttpPost("examinations/{id:long}/prescription/reopen")]
        public async Task<ActionResult<ApiResponse<PrescriptionResponse>>> ReopenPrescriptionAsync(long id, CancellationToken cancellationToken)
        {
            var result = await _examinationService.ReopenPrescriptionAsync(DoctorUserId, id, cancellationToken);
            return Ok(ApiResponse<PrescriptionResponse>.SuccessResult(result, "Prescription reopened"));
        }

        [HttpPost("examinations/{id:long}/diagnoses")]
        public async Task<ActionResult<ApiResponse<List<DiagnosisResponse>>>> AddDiagnosisAsync(
            long id, [FromBody] SaveDiagnosisRequest request, CancellationToken cancellationToken)
        {
            var result = await _examinationService.AddDiagnosisAsync(DoctorUserId, id, request, cancellationToken);
            return Ok(ApiResponse<List<DiagnosisResponse>>.SuccessResult(result, "Diagnosis added"));
        }

        [HttpPut("examinations/{id:long}/diagnoses/{diagnosisId:long}")]
        public async Task<ActionResult<ApiResponse<List<DiagnosisResponse>>>> UpdateDiagnosisAsync(
            long id, long diagnosisId, [FromBody] SaveDiagnosisRequest request, CancellationToken cancellationToken)
        {
            var result = await _examinationService.UpdateDiagnosisAsync(DoctorUserId, id, diagnosisId, request, cancellationToken);
            return Ok(ApiResponse<List<DiagnosisResponse>>.SuccessResult(result, "Diagnosis updated"));
        }

        [HttpDelete("examinations/{id:long}/diagnoses/{diagnosisId:long}")]
        public async Task<ActionResult<ApiResponse<List<DiagnosisResponse>>>> DeleteDiagnosisAsync(
            long id, long diagnosisId, CancellationToken cancellationToken)
        {
            var result = await _examinationService.DeleteDiagnosisAsync(DoctorUserId, id, diagnosisId, cancellationToken);
            return Ok(ApiResponse<List<DiagnosisResponse>>.SuccessResult(result, "Diagnosis deleted"));
        }

        [HttpPut("examinations/{id:long}/follow-up")]
        [Authorize(Roles = RoleConstants.DoctorRole)]
        public async Task<ActionResult<ApiResponse<ExaminationWorkResponse>>> SetFollowUpAsync(
            long id, [FromBody] SaveFollowUpRequest request, CancellationToken cancellationToken)
        {
            var result = await _examinationService.SetFollowUpAsync(DoctorUserId, id, request, cancellationToken);
            return Ok(ApiResponse<ExaminationWorkResponse>.SuccessResult(result, "Follow-up notes saved"));
        }

        [HttpPost("examinations/{id:long}/follow-up/schedule")]
        [Authorize(Roles = $"{RoleConstants.DoctorRole},{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<AppointmentResponse>>> ScheduleFollowUpAsync(
            long id, [FromBody] ScheduleFollowUpRequest request, CancellationToken cancellationToken)
        {
            var result = await _examinationService.ScheduleFollowUpAppointmentAsync(CurrentUserId ?? string.Empty, id, request, cancellationToken);
            return Ok(ApiResponse<AppointmentResponse>.SuccessResult(result, "Follow-up appointment scheduled successfully"));
        }

        [HttpGet("examinations/follow-ups")]
        [Authorize(Roles = $"{RoleConstants.DoctorRole},{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<PagedResult<FollowUpListItemResponse>>>> GetFollowUpsAsync(
            [FromQuery] FollowUpQueryParameters query, CancellationToken cancellationToken)
        {
            var doctorUserId = IsInRole(RoleConstants.DoctorRole) ? CurrentUserId : null;
            var result = await _examinationService.GetFollowUpsAsync(query, doctorUserId, cancellationToken);
            return Ok(ApiResponse<PagedResult<FollowUpListItemResponse>>.SuccessResult(result));
        }

        [HttpPost("examinations/{id:long}/remind-follow-up")]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole},{RoleConstants.DoctorRole}")]
        public async Task<ActionResult<ApiResponse<FollowUpListItemResponse>>> RemindFollowUpAsync(
            long id, CancellationToken cancellationToken)
        {
            var result = await _examinationService.RemindFollowUpAsync(CurrentUserId ?? string.Empty, id, cancellationToken);
            return Ok(ApiResponse<FollowUpListItemResponse>.SuccessResult(result, "Follow-up reminder sent successfully"));
        }
    }
}
