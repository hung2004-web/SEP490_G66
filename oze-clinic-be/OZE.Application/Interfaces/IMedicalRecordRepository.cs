using OZE.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Application.Interfaces
{
    public interface IMedicalRecordRepository
    {
        Task<Patient?> GetPatientAsync(int patientId);
        Task<List<PatientMedicalProfile>> GetActiveMedicalProfilesAsync(int patientId);
        Task<List<Examination>> GetExaminationsAsync(int patientId);
        Task<Examination?> GetExaminationDetailAsync(long examinationId);
        Task<bool> HasDoctorAccessAsync(int doctorId, int patientId);
    }
}
