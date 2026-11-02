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
            return Ok(ApiResponse<ExaminationWorkResponse>.SuccessResult(result, "Đã lưu nội dung khám"));
        }

        [HttpPost("examinations/{id:long}/services")]
        public async Task<ActionResult<ApiResponse<List<ExaminationServiceResponse>>>> AddServiceAsync(
            long id, [FromBody] AddExaminationServiceRequest request, CancellationToken cancellationToken)
        {
            var result = await _examinationService.AddServiceAsync(DoctorUserId, id, request, cancellationToken);
            return Ok(ApiResponse<List<ExaminationServiceResponse>>.SuccessResult(result, "Đã thêm dịch vụ"));
        }

        [HttpDelete("examinations/{id:long}/services/{serviceItemId:long}")]
        public async Task<ActionResult<ApiResponse<List<ExaminationServiceResponse>>>> RemoveServiceAsync(
            long id, long serviceItemId, CancellationToken cancellationToken)
        {
            var result = await _examinationService.RemoveServiceAsync(DoctorUserId, id, serviceItemId, cancellationToken);
            return Ok(ApiResponse<List<ExaminationServiceResponse>>.SuccessResult(result, "Đã bỏ dịch vụ"));
        }

        [HttpPost("examinations/{id:long}/diagnoses")]
        public async Task<ActionResult<ApiResponse<List<DiagnosisResponse>>>> AddDiagnosisAsync(
            long id, [FromBody] SaveDiagnosisRequest request, CancellationToken cancellationToken)
        {
            var result = await _examinationService.AddDiagnosisAsync(DoctorUserId, id, request, cancellationToken);
            return Ok(ApiResponse<List<DiagnosisResponse>>.SuccessResult(result, "Đã thêm chẩn đoán"));
        }

        [HttpPut("examinations/{id:long}/diagnoses/{diagnosisId:long}")]
        public async Task<ActionResult<ApiResponse<List<DiagnosisResponse>>>> UpdateDiagnosisAsync(
            long id, long diagnosisId, [FromBody] SaveDiagnosisRequest request, CancellationToken cancellationToken)
        {
            var result = await _examinationService.UpdateDiagnosisAsync(DoctorUserId, id, diagnosisId, request, cancellationToken);
            return Ok(ApiResponse<List<DiagnosisResponse>>.SuccessResult(result, "Đã cập nhật chẩn đoán"));
        }

        [HttpDelete("examinations/{id:long}/diagnoses/{diagnosisId:long}")]
        public async Task<ActionResult<ApiResponse<List<DiagnosisResponse>>>> DeleteDiagnosisAsync(
            long id, long diagnosisId, CancellationToken cancellationToken)
        {
            var result = await _examinationService.DeleteDiagnosisAsync(DoctorUserId, id, diagnosisId, cancellationToken);
            return Ok(ApiResponse<List<DiagnosisResponse>>.SuccessResult(result, "Đã xóa chẩn đoán"));
        }
    }
}
