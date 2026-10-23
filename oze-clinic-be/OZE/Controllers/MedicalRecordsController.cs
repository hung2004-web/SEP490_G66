using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using System.Security.Claims;

namespace OZE.Controllers
{
    [ApiController]
    [Authorize(Roles = RoleConstants.DoctorRole)]
    [Route("api/medical-records")]
    public class MedicalRecordsController : BaseApiController
    {
        private readonly IMedicalRecordService _medicalRecordService;

        public MedicalRecordsController(IMedicalRecordService medicalRecordService)
        {
            _medicalRecordService = medicalRecordService;
        }

        [HttpGet("patients/{patientId:int}")]
        public async Task<ActionResult<ApiResponse<PatientMedicalRecordResponse>>> GetPatientRecordAsync(int patientId)
        {
            var record = await _medicalRecordService.GetPatientRecordAsync(CurrentUserId ?? string.Empty, patientId);
            return Ok(ApiResponse<PatientMedicalRecordResponse>.SuccessResult(record));
        }

        [HttpGet("examinations/{examinationId:long}")]
        public async Task<ActionResult<ApiResponse<ExaminationDetailResponse>>> GetExaminationDetailAsync(long examinationId)
        {
            var detail = await _medicalRecordService.GetExaminationDetailAsync(CurrentUserId ?? string.Empty, examinationId);
            return Ok(ApiResponse<ExaminationDetailResponse>.SuccessResult(detail));
        }
    }
}
