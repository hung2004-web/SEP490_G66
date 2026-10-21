using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Application.Services
{
    public class MedicalRecordService : IMedicalRecordService
    {
        private readonly IMedicalRecordRepository _medicalRecordRepository;
        private readonly IStaffRepository _staffRepository;

        public MedicalRecordService(IMedicalRecordRepository medicalRecordRepository, IStaffRepository staffRepository)
        {
            _medicalRecordRepository = medicalRecordRepository;
            _staffRepository = staffRepository;
        }

        public async Task<PatientMedicalRecordResponse> GetPatientRecordAsync(string userId, int patientId)
        {
            var patient = await _medicalRecordRepository.GetPatientAsync(patientId);
            ConditionGuard.Ensure<NotFoundException>(patient != null, ErrorConstants.MedicalRecordMessage.PatientNotFound);
            await EnsureAccessAsync(userId, patientId);

            var profiles = await _medicalRecordRepository.GetActiveMedicalProfilesAsync(patientId);
            var examinations = await _medicalRecordRepository.GetExaminationsAsync(patientId);

            return new PatientMedicalRecordResponse
            {
                PatientId = patient!.Id,
                PatientCode = patient.PatientCode,
                FullName = patient.FullName,
                DateOfBirth = patient.DateOfBirth,
                Gender = patient.Gender,
                PhoneNumber = patient.PhoneNumber,
                BloodType = patient.BloodType,
                Notes = patient.Notes,
                MedicalProfiles = profiles.Select(x => new MedicalProfileResponse
                {
                    Id = x.Id,
                    RecordType = x.RecordType,
                    Title = x.Title,
                    Description = x.Description,
                    Severity = x.Severity
                }).ToList(),
                Examinations = examinations.Select(x => new ExaminationSummaryResponse
                {
                    Id = x.Id,
                    AppointmentDate = x.Appointment.AppointmentDate,
                    DoctorName = x.Doctor.FullName,
                    ChiefComplaint = x.ChiefComplaint,
                    PrimaryDiagnosis = x.Diagnoses.FirstOrDefault(d => d.IsPrimary)?.DiagnosisName,
                    ExaminationStatus = x.ExaminationStatus
                }).ToList()
            };
        }

        public async Task<ExaminationDetailResponse> GetExaminationDetailAsync(string userId, long examinationId)
        {
            var exam = await _medicalRecordRepository.GetExaminationDetailAsync(examinationId);
            ConditionGuard.Ensure<NotFoundException>(exam != null, ErrorConstants.MedicalRecordMessage.ExaminationNotFound);
            await EnsureAccessAsync(userId, exam!.PatientId);

            return new ExaminationDetailResponse
            {
                Id = exam.Id,
                PatientId = exam.PatientId,
                AppointmentDate = exam.Appointment.AppointmentDate,
                DoctorName = exam.Doctor.FullName,
                ChiefComplaint = exam.ChiefComplaint,
                ClinicalNotes = exam.ClinicalNotes,
                ExaminationStatus = exam.ExaminationStatus,
                Diagnoses = exam.Diagnoses
                    .OrderByDescending(d => d.IsPrimary)
                    .Select(d => new DiagnosisResponse
                    {
                        Id = d.Id,
                        DiagnosisCode = d.DiagnosisCode,
                        DiagnosisName = d.DiagnosisName,
                        Description = d.Description,
                        IsPrimary = d.IsPrimary
                    }).ToList(),
                Prescriptions = exam.Prescriptions.Select(p => new PrescriptionResponse
                {
                    Id = p.Id,
                    Status = p.Status,
                    Notes = p.Notes,
                    Items = p.Items.OrderBy(i => i.SortOrder).Select(i => new PrescriptionItemResponse
                    {
                        MedicationName = i.MedicationName,
                        Dosage = i.Dosage,
                        Frequency = i.Frequency,
                        Duration = i.Duration,
                        Quantity = i.Quantity,
                        Instructions = i.Instructions
                    }).ToList()
                }).ToList(),
                TreatmentPlans = exam.TreatmentPlans.Select(t => new TreatmentPlanSummaryResponse
                {
                    Id = t.Id,
                    PlanName = t.PlanName,
                    Status = t.Status,
                    TotalStages = t.TotalStages,
                    EstimatedTotalCost = t.EstimatedTotalCost
                }).ToList(),
                // AC4: images rejected for poor quality are hidden
                Images = exam.ImagingRequests
                    .SelectMany(r => r.Results
                        .Where(img => img.ReviewStatus != MedicalRecordConstants.RejectedImageStatus)
                        .Select(img => new ImagingResponse
                        {
                            ResultId = img.Id,
                            ImagingType = r.ImagingType,
                            TargetArea = r.TargetArea,
                            FileName = img.FileName,
                            FilePath = img.FilePath,
                            ReviewStatus = img.ReviewStatus,
                            DoctorNotes = img.DoctorNotes,
                            CreatedAt = img.CreatedAt
                        }))
                    .OrderBy(img => img.CreatedAt)
                    .ToList()
            };
        }

        // AC5
        private async Task EnsureAccessAsync(string userId, int patientId)
        {
            var doctor = await _staffRepository.GetByUserIdAsync(userId);
            ConditionGuard.Ensure<NotFoundException>(doctor != null, ErrorConstants.MedicalRecordMessage.DoctorNotFound);

            var hasAccess = await _medicalRecordRepository.HasDoctorAccessAsync(doctor!.Id, patientId);
            ConditionGuard.Ensure<ForbiddenException>(hasAccess, ErrorConstants.MedicalRecordMessage.AccessDenied);
        }
    }
}
