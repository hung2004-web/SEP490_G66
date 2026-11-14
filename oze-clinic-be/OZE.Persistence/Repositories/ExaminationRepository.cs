using Microsoft.EntityFrameworkCore;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class ExaminationRepository : IExaminationRepository
    {
        private readonly AppIdentityDbContext _context;

        public ExaminationRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public Task<Examination?> GetForWorkAsync(long examinationId, CancellationToken cancellationToken = default)
        {
            // Not AsNoTracking: the caller changes the examination and its children, then saves once
            // Split: one query per collection, instead of one row for every combination of services, diagnoses, teeth and medications
            return _context.Examinations
                .AsSplitQuery()
                .Include(x => x.Appointment)
                    .ThenInclude(x => x.ServiceItems)
                        .ThenInclude(x => x.Service)
                .Include(x => x.Appointment)
                    .ThenInclude(x => x.ServiceItems)
                        .ThenInclude(x => x.Variant)
                .Include(x => x.FollowUpAppointment)
                    .ThenInclude(x => x!.Doctor)
                .Include(x => x.Diagnoses)
                .Include(x => x.DentalChartEntries)
                .Include(x => x.Prescriptions)
                    .ThenInclude(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == examinationId, cancellationToken);
        }

        public Task<List<DentalChartEntry>> GetEarlierChartEntriesAsync(int patientId, DateTimeOffset before, long excludeExaminationId, CancellationToken cancellationToken = default)
        {
            return _context.DentalChartEntries
                .AsNoTracking()
                .Where(x => x.PatientId == patientId && x.ExaminationId != excludeExaminationId && x.Examination.CreatedAt < before)
                .ToListAsync(cancellationToken);
        }

        public void RemoveChartEntry(DentalChartEntry entry)
        {
            _context.DentalChartEntries.Remove(entry);
        }

        public Task<Service?> GetServiceAsync(int serviceId, CancellationToken cancellationToken = default)
        {
            // Active variants are loaded so the exam can tell a service that needs a variant chosen
            return _context.Services
                .Include(x => x.Variants.Where(v => v.IsActive))
                .FirstOrDefaultAsync(x => x.Id == serviceId, cancellationToken);
        }

        public Task<ServiceVariant?> GetVariantAsync(int variantId, CancellationToken cancellationToken = default)
        {
            return _context.ServiceVariants.FirstOrDefaultAsync(x => x.Id == variantId, cancellationToken);
        }

        public async Task<string?> GetConfigValueAsync(string configKey)
        {
            return await _context.SystemConfigurations
                .AsNoTracking()
                .Where(x => x.ConfigKey == configKey)
                .Select(x => x.ConfigValue)
                .FirstOrDefaultAsync();
        }

        public void RemoveServiceItem(AppointmentServiceItem item)
        {
            _context.AppointmentServiceItems.Remove(item);
        }

        public void RemovePrescription(Prescription prescription)
        {
            _context.Prescriptions.Remove(prescription);
        }

        public void RemovePrescriptionItem(PrescriptionItem item)
        {
            _context.PrescriptionItems.Remove(item);
        }

        public void RemoveDiagnosis(ClinicalDiagnosis diagnosis)
        {
            _context.ClinicalDiagnoses.Remove(diagnosis);
        }

        public Task<Examination?> GetByIdWithFollowUpAsync(long examinationId, CancellationToken cancellationToken = default)
        {
            return _context.Examinations
                .Include(x => x.Patient)
                .Include(x => x.Doctor)
                .Include(x => x.Appointment)
                .Include(x => x.FollowUpAppointment)
                    .ThenInclude(x => x!.Doctor)
                .FirstOrDefaultAsync(x => x.Id == examinationId, cancellationToken);
        }

        public async Task<PagedResult<Examination>> GetFollowUpsAsync(FollowUpQueryParameters parameters, CancellationToken cancellationToken = default)
        {
            var query = _context.Examinations
                .AsNoTracking()
                .Include(x => x.Patient)
                .Include(x => x.Doctor)
                .Include(x => x.Appointment)
                .Include(x => x.FollowUpAppointment)
                    .ThenInclude(x => x!.Doctor)
                .Include(x => x.FollowUpContacts)
                .Where(x => x.FollowUpDate != null || x.FollowUpAppointmentId != null);

            // A follow-up the patient declined leaves the working lists unless asked for
            if (!parameters.IncludeClosed)
            {
                query = query.Where(x => !x.FollowUpClosed);
            }

            if (parameters.FromDate.HasValue)
            {
                var from = parameters.FromDate.Value;
                query = query.Where(x => x.FollowUpDate >= from || (x.FollowUpAppointment != null && x.FollowUpAppointment.AppointmentDate >= from));
            }

            if (parameters.ToDate.HasValue)
            {
                var to = parameters.ToDate.Value;
                query = query.Where(x => x.FollowUpDate <= to || (x.FollowUpAppointment != null && x.FollowUpAppointment.AppointmentDate <= to));
            }

            if (parameters.DoctorId.HasValue)
            {
                var docId = parameters.DoctorId.Value;
                query = query.Where(x => x.DoctorId == docId || (x.FollowUpAppointment != null && x.FollowUpAppointment.DoctorId == docId));
            }

            if (parameters.HasAppointment.HasValue)
            {
                query = parameters.HasAppointment.Value
                    ? query.Where(x => x.FollowUpAppointmentId != null && x.FollowUpAppointment!.Status != AppointmentConstants.CancelledStatus && x.FollowUpAppointment!.Status != AppointmentConstants.NoShowStatus)
                    : query.Where(x => x.FollowUpAppointmentId == null || x.FollowUpAppointment!.Status == AppointmentConstants.CancelledStatus || x.FollowUpAppointment!.Status == AppointmentConstants.NoShowStatus);
            }

            if (!string.IsNullOrWhiteSpace(parameters.SearchKeyword))
            {
                var keyword = parameters.SearchKeyword.Trim();
                query = query.Where(x => x.Patient.FullName.Contains(keyword)
                    || (x.Patient.PhoneNumber != null && x.Patient.PhoneNumber.Contains(keyword))
                    || x.Patient.PatientCode.Contains(keyword));
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var items = await query
                .OrderBy(x => x.FollowUpDate ?? (x.FollowUpAppointment != null ? x.FollowUpAppointment.AppointmentDate : DateOnly.MaxValue))
                .ThenByDescending(x => x.CreatedAt)
                .Skip((parameters.PageNumber - 1) * parameters.PageSize)
                .Take(parameters.PageSize)
                .ToListAsync(cancellationToken);

            return new PagedResult<Examination>(items, totalCount, parameters.PageNumber, parameters.PageSize);
        }

        public async Task<List<Examination>> GetDueFollowUpsAsync(DateOnly targetDate, CancellationToken cancellationToken = default)
        {
            var today = DateOnly.FromDateTime(ClinicClock.Today);
            var todayStartUtc = new DateTimeOffset(today.ToDateTime(TimeOnly.MinValue), TimeSpan.FromHours(ClinicTimeConstants.UtcOffsetHours)).ToUniversalTime();

            return await _context.Examinations
                .Include(x => x.Patient)
                .Include(x => x.Doctor)
                .Include(x => x.Appointment)
                .Include(x => x.FollowUpAppointment)
                    .ThenInclude(x => x!.Doctor)
                .Where(x => (x.FollowUpDate == targetDate || (x.FollowUpAppointment != null && x.FollowUpAppointment.AppointmentDate == targetDate))
                         && (x.FollowUpAppointment == null || (x.FollowUpAppointment.Status != AppointmentConstants.CancelledStatus && x.FollowUpAppointment.Status != AppointmentConstants.CompletedStatus && x.FollowUpAppointment.Status != AppointmentConstants.NoShowStatus))
                         && !x.FollowUpClosed
                         && (x.FollowUpRemindedAt == null || x.FollowUpRemindedAt < todayStartUtc))
                .OrderBy(x => x.FollowUpDate)
                .ToListAsync(cancellationToken);
        }

        public async Task<Patient?> GetPatientByUserIdAsync(string userId, CancellationToken cancellationToken = default)
        {
            return await _context.Patients
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.UserId == userId && p.DeletedAt == null, cancellationToken);
        }

        public async Task<List<Examination>> GetPatientFollowUpsAsync(int patientId, CancellationToken cancellationToken = default)
        {
            return await _context.Examinations
                .AsNoTracking()
                .Include(x => x.Patient)
                .Include(x => x.Doctor)
                .Include(x => x.Appointment)
                .Include(x => x.FollowUpAppointment)
                    .ThenInclude(x => x!.Doctor)
                .Where(x => x.PatientId == patientId && (x.FollowUpDate != null || x.FollowUpAppointmentId != null))
                .OrderByDescending(x => x.FollowUpDate ?? (x.FollowUpAppointment != null ? x.FollowUpAppointment.AppointmentDate : DateOnly.MinValue))
                .ThenByDescending(x => x.CreatedAt)
                .ToListAsync(cancellationToken);
        }

        public async Task AddNotificationAsync(Notification notification, CancellationToken cancellationToken = default)
        {
            await _context.Notifications.AddAsync(notification, cancellationToken);
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return _context.SaveChangesAsync(cancellationToken);
        }
    }
}
