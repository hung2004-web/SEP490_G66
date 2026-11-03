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
            long id, [FromBody] SaveExaminationServiceRequest request, CancellationToken cancellationToken)
        {
            var result = await _examinationService.AddServiceAsync(DoctorUserId, id, request, cancellationToken);
            return Ok(ApiResponse<List<ExaminationServiceResponse>>.SuccessResult(result, "Đã thêm dịch vụ"));
        }

        [HttpPut("examinations/{id:long}/services/{serviceItemId:long}")]
        public async Task<ActionResult<ApiResponse<List<ExaminationServiceResponse>>>> UpdateServiceAsync(
            long id, long serviceItemId, [FromBody] SaveExaminationServiceRequest request, CancellationToken cancellationToken)
        {
            var result = await _examinationService.UpdateServiceAsync(DoctorUserId, id, serviceItemId, request, cancellationToken);
            return Ok(ApiResponse<List<ExaminationServiceResponse>>.SuccessResult(result, "Đã cập nhật dịch vụ"));
        }

        [HttpDelete("examinations/{id:long}/services/{serviceItemId:long}")]
        public async Task<ActionResult<ApiResponse<List<ExaminationServiceResponse>>>> RemoveServiceAsync(
            long id, long serviceItemId, CancellationToken cancellationToken)
        {
            var result = await _examinationService.RemoveServiceAsync(DoctorUserId, id, serviceItemId, cancellationToken);
            return Ok(ApiResponse<List<ExaminationServiceResponse>>.SuccessResult(result, "Đã bỏ dịch vụ"));
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
            return Ok(ApiResponse<List<DentalChartToothResponse>>.SuccessResult(result, "Đã cập nhật sơ đồ răng"));
        }

        [HttpDelete("examinations/{id:long}/dental-chart/{toothNumber}")]
        public async Task<ActionResult<ApiResponse<List<DentalChartToothResponse>>>> RemoveToothChangeAsync(
            long id, string toothNumber, CancellationToken cancellationToken)
        {
            var result = await _examinationService.RemoveToothChangeAsync(DoctorUserId, id, toothNumber, cancellationToken);
            return Ok(ApiResponse<List<DentalChartToothResponse>>.SuccessResult(result, "Đã bỏ thay đổi của răng"));
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
            return Ok(ApiResponse<PrescriptionResponse>.SuccessResult(result, "Đã lưu ghi chú đơn thuốc"));
        }

        [HttpDelete("examinations/{id:long}/prescription")]
        public async Task<ActionResult<ApiResponse<PrescriptionResponse>>> DeletePrescriptionAsync(long id, CancellationToken cancellationToken)
        {
            var result = await _examinationService.DeletePrescriptionAsync(DoctorUserId, id, cancellationToken);
            return Ok(ApiResponse<PrescriptionResponse>.SuccessResult(result, "Đã xóa đơn thuốc"));
        }

        [HttpPost("examinations/{id:long}/prescription/items")]
        public async Task<ActionResult<ApiResponse<PrescriptionResponse>>> AddPrescriptionItemAsync(
            long id, [FromBody] SavePrescriptionItemRequest request, CancellationToken cancellationToken)
        {
            var result = await _examinationService.AddPrescriptionItemAsync(DoctorUserId, id, request, cancellationToken);
            return Ok(ApiResponse<PrescriptionResponse>.SuccessResult(result, "Đã thêm thuốc"));
        }

        [HttpPut("examinations/{id:long}/prescription/items/{itemId:long}")]
        public async Task<ActionResult<ApiResponse<PrescriptionResponse>>> UpdatePrescriptionItemAsync(
            long id, long itemId, [FromBody] SavePrescriptionItemRequest request, CancellationToken cancellationToken)
        {
            var result = await _examinationService.UpdatePrescriptionItemAsync(DoctorUserId, id, itemId, request, cancellationToken);
            return Ok(ApiResponse<PrescriptionResponse>.SuccessResult(result, "Đã cập nhật thuốc"));
        }

        [HttpDelete("examinations/{id:long}/prescription/items/{itemId:long}")]
        public async Task<ActionResult<ApiResponse<PrescriptionResponse>>> DeletePrescriptionItemAsync(
            long id, long itemId, CancellationToken cancellationToken)
        {
            var result = await _examinationService.DeletePrescriptionItemAsync(DoctorUserId, id, itemId, cancellationToken);
            return Ok(ApiResponse<PrescriptionResponse>.SuccessResult(result, "Đã bỏ thuốc"));
        }

        [HttpPost("examinations/{id:long}/prescription/finalize")]
        public async Task<ActionResult<ApiResponse<PrescriptionResponse>>> FinalizePrescriptionAsync(long id, CancellationToken cancellationToken)
        {
            var result = await _examinationService.FinalizePrescriptionAsync(DoctorUserId, id, cancellationToken);
            return Ok(ApiResponse<PrescriptionResponse>.SuccessResult(result, "Đã chốt đơn thuốc"));
        }

        [HttpPost("examinations/{id:long}/prescription/reopen")]
        public async Task<ActionResult<ApiResponse<PrescriptionResponse>>> ReopenPrescriptionAsync(long id, CancellationToken cancellationToken)
        {
            var result = await _examinationService.ReopenPrescriptionAsync(DoctorUserId, id, cancellationToken);
            return Ok(ApiResponse<PrescriptionResponse>.SuccessResult(result, "Đã mở lại đơn thuốc"));
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
