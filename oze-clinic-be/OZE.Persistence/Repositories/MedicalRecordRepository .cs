using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Persistence.Repositories
{
    public class MedicalRecordRepository : IMedicalRecordRepository
    {
        private readonly AppIdentityDbContext _context;

        public MedicalRecordRepository(AppIdentityDbContext context)
        {
            _context = context;
        }
        public async Task<Patient?> GetPatientAsync(int patientId)
        {
            return await _context.Patients
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == patientId && x.DeletedAt == null);
        }

        public async Task<List<PatientMedicalProfile>> GetActiveMedicalProfilesAsync(int patientId)
        {
            return await _context.PatientMedicalProfiles
                .AsNoTracking()
                .Where(x => x.PatientId == patientId && x.Status == MedicalRecordConstants.ActiveProfileStatus)
                .OrderBy(x => x.RecordType)
                .ToListAsync();
        }

        // AC2: newest visit first
        public async Task<List<Examination>> GetExaminationsAsync(int patientId)
        {
            return await _context.Examinations
                .AsNoTracking()
                .Include(x => x.Appointment)
                .Include(x => x.Doctor)
                .Include(x => x.Diagnoses)
                .Where(x => x.PatientId == patientId)
                .OrderByDescending(x => x.Appointment.AppointmentDate)
                .ThenByDescending(x => x.CreatedAt)
                .ToListAsync();
        }

      
        public async Task<Examination?> GetExaminationDetailAsync(long examinationId)
        {
            return await _context.Examinations
                .AsNoTracking()
                .AsSplitQuery()
                .Include(x => x.Appointment)
                .Include(x => x.Doctor)
                .Include(x => x.Diagnoses)
                .Include(x => x.Prescriptions).ThenInclude(p => p.Items)
                .Include(x => x.TreatmentPlans)
                .Include(x => x.ImagingRequests).ThenInclude(r => r.Results)
                .FirstOrDefaultAsync(x => x.Id == examinationId);
        }

       
        public async Task<bool> HasDoctorAccessAsync(int doctorId, int patientId)
        {
            var hasExamined = await _context.Examinations
                .AnyAsync(x => x.PatientId == patientId && x.DoctorId == doctorId);
            if (hasExamined)
            {
                return true;
            }

            return await _context.Appointments
                .AnyAsync(x => x.PatientId == patientId && x.DoctorId == doctorId
                    && x.Status != AppointmentConstants.CancelledStatus);
        }
    }
}
