using OZE.Common.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Application.Interfaces
{
    public interface IMedicalRecordService
    {
        Task<PatientMedicalRecordResponse> GetPatientRecordAsync(string userId, int patientId);
        Task<ExaminationDetailResponse> GetExaminationDetailAsync(string userId, long examinationId);
    }
}
