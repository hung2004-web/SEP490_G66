using OZE.Application.Helpers;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;
using System.Threading;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Persistence.Repositories
{
    public class AppointmentRepository : IAppointmentRepository
    {
        private readonly AppIdentityDbContext _context;

        public AppointmentRepository(AppIdentityDbContext context)
        {
            _context = context;
        }
        public async Task AddAsync(Appointment appointment)
        {
            await _context.Appointments.AddAsync(appointment);
        }

        public async Task AddPatientAsync(Patient patient)
        {
            await _context.Patients.AddAsync(patient);
        }

        public async Task<Patient?> GetPatientByUserIdAsync(string userId)
        {
            return await _context.Patients
                .FirstOrDefaultAsync(x => x.UserId == userId && x.DeletedAt == null);
        }

        // A transaction the database gave up because another one, doing the same thing, was in its way
        private const int DeadlockErrorNumber = 1205;
        private const int MaxDeadlockAttempts = 3;

        public async Task<T> ExecuteSerializableAsync<T>(Func<Task<T>> action)
        {
            for (var attempt = 1; ; attempt++)
            {
                try
                {
                    var strategy = _context.Database.CreateExecutionStrategy();
                    return await strategy.ExecuteAsync(async () =>
                    {
                        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
                        var result = await action();
                        await transaction.CommitAsync();
                        return result;
                    });
                }
                catch (Exception ex) when (attempt < MaxDeadlockAttempts && IsDeadlockVictim(ex))
                {
                    // Two requests asked for the same thing at once and this one had to give way. Forget what it read and
                    // try again: it now sees the result of the other one (for example the patient record just created).
                    _context.ChangeTracker.Clear();
                }
            }
        }

        private static bool IsDeadlockVictim(Exception exception)
        {
            for (var current = exception; current != null; current = current.InnerException)
            {
                if (current is SqlException sql && sql.Number == DeadlockErrorNumber)
                {
                    return true;
                }
            }

            return false;
        }

        public async Task<List<Appointment>> GetActiveAppointmentsAsync(DateOnly date, IReadOnlyCollection<int> doctorIds)
        {
            return await _context.Appointments
                .AsNoTracking()
                .Where(x => x.AppointmentDate == date
                    && x.DoctorId != null && doctorIds.Contains(x.DoctorId.Value)
                    && x.Status != AppointmentConstants.CancelledStatus
                    && x.Status != AppointmentConstants.NoShowStatus)
                .ToListAsync();
        }

        public async Task<string?> GetConfigValueAsync(string configKey)
        {
            return await _context.SystemConfigurations
                .AsNoTracking()
                .Where(x => x.ConfigKey == configKey)
                .Select(x => x.ConfigValue)
                .FirstOrDefaultAsync();
        }

        public async Task<List<Appointment>> GetDoctorAppointmentsAsync(int doctorId, DateOnly fromDate, DateOnly toDate)
        {
            return await _context.Appointments
                .AsNoTracking()
                .Include(x => x.Patient)
                .Where(x => x.DoctorId == doctorId
                && x.AppointmentDate >= fromDate && x.AppointmentDate <= toDate
                && x.Status != AppointmentConstants.CancelledStatus)
                .OrderBy(x => x.AppointmentDate)
                .ThenBy(x => x.TimeSlotStart)
                .ToListAsync();
        }

        public async Task<List<StaffSchedule>> GetEndedShiftsAsync(DateOnly date)
        {
            return await _context.StaffSchedules
                .AsNoTracking()
                .Where(x => x.ScheduleDate == date && x.ActualEndTime != null)
                .ToListAsync();
        }

        public async Task<List<Appointment>> GetAppointmentsOfDoctorsAsync(DateOnly date, IReadOnlyCollection<int> doctorIds, IReadOnlyCollection<string> statuses)
        {
            return await _context.Appointments
                .AsNoTracking()
                .Include(x => x.Patient)
                .Include(x => x.Doctor)
                .Include(x => x.Examination)
                    .ThenInclude(x => x!.FollowUpAppointment)
                        .ThenInclude(x => x!.Doctor)
                .Include(x => x.ParentAppointment)
                    .ThenInclude(x => x!.Examination)
                .Include(x => x.Examination)
                .Include(x => x.QueueEntries)
                    .ThenInclude(x => x.Room)
                .Where(x => x.DoctorId != null && doctorIds.Contains(x.DoctorId.Value)
                    && x.AppointmentDate == date
                    && statuses.Contains(x.Status))
                .ToListAsync();
        }

        public async Task<List<Appointment>> GetDoctorOpenAppointmentsAsync(int doctorId, DateOnly date, CancellationToken cancellationToken = default)
        {
            // Not AsNoTracking: the caller changes the status and saves
            return await _context.Appointments
                .Include(x => x.Patient)
                .Include(x => x.Examination)
                .Where(x => x.DoctorId == doctorId && x.AppointmentDate == date
                    && (x.Status == AppointmentConstants.PendingStatus
                        || x.Status == AppointmentConstants.ConfirmedStatus
                        || x.Status == AppointmentConstants.CheckedInStatus
                        || x.Status == AppointmentConstants.InServiceStatus))
                .ToListAsync(cancellationToken);
        }

        public async Task<bool> HasEndedShiftAsync(int doctorId, DateOnly date)
        {
            return await _context.StaffSchedules
                .AnyAsync(x => x.StaffProfileId == doctorId && x.ScheduleDate == date && x.ActualEndTime != null);
        }

        public async Task<List<StaffSchedule>> GetDoctorShiftsAsync(DateOnly date, int? doctorId)
        {
            // Doctor role ids, joined through Identity tables
            var doctorUserIds = from ur in _context.UserRoles
                                join r in _context.Roles on ur.RoleId equals r.Id
                                where r.Name == RoleConstants.DoctorRole
                                select ur.UserId;

            var shifts = _context.StaffSchedules
                .AsNoTracking()
                .Include(x => x.StaffProfile)
                .Include(x => x.Room)
                .Where(x => x.ScheduleDate == date
                    && x.IsPresent != false
                    && x.ActualEndTime == null
                    && x.StaffProfile.IsActive
                    && doctorUserIds.Contains(x.StaffProfile.UserId)
                    && x.Room != null && x.Room.Status == RoomConstants.ActiveStatus);

            if (doctorId.HasValue)
            {
                shifts = shifts.Where(x => x.StaffProfileId == doctorId);
            }

            return await shifts.OrderBy(x => x.ShiftStart).ToListAsync();
        }

        public async Task SaveChangesAsync()
        {
         await _context.SaveChangesAsync();
        }

        public async Task<List<Service>> GetServicesByIdsAsync(IReadOnlyCollection<int> serviceIds)
        {
            return await _context.Services
                .AsNoTracking()
                .Where(s => serviceIds.Contains(s.Id))
                .ToListAsync();
        }

        public async Task<List<ServiceVariant>> GetVariantsByIdsAsync(IReadOnlyCollection<int> variantIds)
        {
            return await _context.ServiceVariants
                .AsNoTracking()
                .Include(v => v.Service)
                .Where(v => variantIds.Contains(v.Id))
                .ToListAsync();
        }

        // Active services with their active variants, in display order
        public async Task<List<Service>> GetBookableServicesAsync()
        {
            return await _context.Services
                .AsNoTracking()
                .Where(s => s.IsActive)
                .Include(s => s.Variants.Where(v => v.IsActive).OrderBy(v => v.DisplayOrder))
                .OrderBy(s => s.ServiceName)
                .ToListAsync();
        }

        public async Task<List<Appointment>> GetWaitingAppointmentsAsync(DateOnly date, int? doctorId, CancellationToken cancellationToken = default)
        {
            var query = _context.Appointments
                .AsNoTracking()
                .Include(x => x.Patient)
                .Include(x => x.Doctor)
                .Include(x => x.Examination)
                    .ThenInclude(x => x!.FollowUpAppointment)
                        .ThenInclude(x => x!.Doctor)
                .Include(x => x.ParentAppointment)
                    .ThenInclude(x => x!.Examination)
                .Include(x => x.ServiceItems)
                    .ThenInclude(x => x.Service)
                .Include(x => x.ServiceItems)
                    .ThenInclude(x => x.Variant)
                .Include(x => x.Examination)
                    .ThenInclude(x => x!.ImagingRequests)
                .Include(x => x.QueueEntries)
                    .ThenInclude(x => x.Room)
                .Where(x => x.AppointmentDate == date && x.Status == AppointmentConstants.CheckedInStatus);

            if (doctorId.HasValue)
            {
                query = query.Where(x => x.DoctorId == doctorId.Value);
            }

            var appointments = await query.ToListAsync(cancellationToken);

            // Filter out patients who are currently in the X-ray/Imaging room (pending or in-progress imaging)
            return appointments.Where(a =>
                a.Examination == null ||
                !a.Examination.ImagingRequests.Any(r =>
                    r.RequestStatus == ImagingRequestConstants.Pending ||
                    r.RequestStatus == ImagingRequestConstants.InProgress)
            ).ToList();
        }

        public async Task<int?> GetStaffProfileIdByUserIdAsync(string userId)
        {
            return await _context.StaffProfiles
                .Where(x => x.UserId == userId)
                .Select(x => (int?)x.Id)
                .FirstOrDefaultAsync();
        }

        public async Task<Appointment?> GetByIdWithDetailsAsync(long id, CancellationToken cancellationToken = default)
        {
            return await _context.Appointments
                .Include(x => x.Patient)
                .Include(x => x.Doctor)
                .Include(x => x.Examination)
                    .ThenInclude(x => x!.FollowUpAppointment)
                        .ThenInclude(x => x!.Doctor)
                .Include(x => x.ParentAppointment)
                    .ThenInclude(x => x!.Examination)
                .Include(x => x.ServiceItems)
                    .ThenInclude(x => x.Service)
                .Include(x => x.ServiceItems)
                    .ThenInclude(x => x.Variant)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        }

        public async Task<Appointment?> GetByIdWithExaminationAsync(long id, CancellationToken cancellationToken = default)
        {
            return await _context.Appointments
                .Include(x => x.Patient)
                .Include(x => x.Doctor)
                .Include(x => x.Examination)
                    .ThenInclude(x => x!.FollowUpAppointment)
                        .ThenInclude(x => x!.Doctor)
                .Include(x => x.ParentAppointment)
                    .ThenInclude(x => x!.Examination)
                .Include(x => x.Examination)
                .Include(x => x.ServiceItems)
                    .ThenInclude(x => x.Service)
                .Include(x => x.ServiceItems)
                    .ThenInclude(x => x.Variant)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        }

        public async Task<(int Diagnoses, int DraftPrescriptionsWithItems)> GetExaminationCompletionCountsAsync(long examinationId, CancellationToken cancellationToken = default)
        {
            var diagnoses = await _context.ClinicalDiagnoses.CountAsync(x => x.ExaminationId == examinationId, cancellationToken);
            var drafts = await _context.Prescriptions.CountAsync(x => x.ExaminationId == examinationId
                && x.Status == PrescriptionConstants.Draft && x.Items.Any(), cancellationToken);
            return (diagnoses, drafts);
        }

        public async Task RemoveEmptyDraftPrescriptionsAsync(long examinationId, CancellationToken cancellationToken = default)
        {
            await _context.Prescriptions
                .Where(x => x.ExaminationId == examinationId && x.Status == PrescriptionConstants.Draft && !x.Items.Any())
                .ExecuteDeleteAsync(cancellationToken);
        }

        public async Task<bool> HasAppointmentInServiceAsync(int doctorId, DateOnly date)
        {
            return await _context.Appointments
                .AnyAsync(x => x.DoctorId == doctorId
                    && x.AppointmentDate == date
                    && x.Status == AppointmentConstants.InServiceStatus);
        }

        public async Task<bool> HasUnfinishedAppointmentAsync(int patientId, long? excludeAppointmentId = null)
        {
            // An appointment of a day that has passed is not counted: the patient did not come and nobody closed it,
            // and a checked-in one can no longer be cancelled or examined, so it would block the patient for good
            var today = DateOnly.FromDateTime(ClinicClock.Today);
            return await _context.Appointments
                .AnyAsync(x => x.PatientId == patientId
                    && (excludeAppointmentId == null || x.Id != excludeAppointmentId.Value)
                    && x.AppointmentDate >= today
                    && AppointmentConstants.UnfinishedStatuses.Contains(x.Status));
        }

        public async Task<PagedResult<Appointment>> GetAppointmentsAsync(AppointmentQueryParameters parameters, CancellationToken cancellationToken = default)
        {
            var query = _context.Appointments
                .AsNoTracking()
                .Include(x => x.Patient)
                .Include(x => x.Doctor)
                .Include(x => x.Examination)
                    .ThenInclude(x => x!.FollowUpAppointment)
                        .ThenInclude(x => x!.Doctor)
                .Include(x => x.ParentAppointment)
                    .ThenInclude(x => x!.Examination)
                .Include(x => x.ServiceItems)
                    .ThenInclude(x => x.Service)
                .Include(x => x.ServiceItems)
                    .ThenInclude(x => x.Variant)
                .AsQueryable();

            if (parameters.Date.HasValue)
            {
                query = query.Where(x => x.AppointmentDate == parameters.Date.Value);
            }
            else
            {
                if (parameters.FromDate.HasValue)
                {
                    query = query.Where(x => x.AppointmentDate >= parameters.FromDate.Value);
                }
                if (parameters.ToDate.HasValue)
                {
                    query = query.Where(x => x.AppointmentDate <= parameters.ToDate.Value);
                }
            }

            if (parameters.DoctorId.HasValue)
            {
                query = query.Where(x => x.DoctorId == parameters.DoctorId.Value);
            }

            if (parameters.PatientId.HasValue)
            {
                query = query.Where(x => x.PatientId == parameters.PatientId.Value);
            }

            if (!string.IsNullOrWhiteSpace(parameters.Status))
            {
                var status = parameters.Status.Trim().ToUpperInvariant();
                query = query.Where(x => x.Status == status);
            }

            if (!string.IsNullOrWhiteSpace(parameters.SearchKeyword))
            {
                var kw = parameters.SearchKeyword.Trim();
                query = query.Where(x => x.Patient.FullName.Contains(kw)
                    || x.Patient.PatientCode.Contains(kw)
                    || (x.Patient.PhoneNumber != null && x.Patient.PhoneNumber.Contains(kw)));
            }

            var totalCount = await query.CountAsync(cancellationToken);
            if (totalCount == 0)
            {
                return new PagedResult<Appointment>(new List<Appointment>(), 0, parameters.PageNumber, parameters.PageSize);
            }

            query = parameters.SortBy?.Trim().ToLowerInvariant() switch
            {
                "patientname" => parameters.SortDescending ? query.OrderByDescending(x => x.Patient.FullName) : query.OrderBy(x => x.Patient.FullName),
                "status" => parameters.SortDescending ? query.OrderByDescending(x => x.Status) : query.OrderBy(x => x.Status),
                "createdat" => parameters.SortDescending ? query.OrderByDescending(x => x.CreatedAt) : query.OrderBy(x => x.CreatedAt),
                _ => parameters.SortDescending
                    ? query.OrderByDescending(x => x.AppointmentDate).ThenByDescending(x => x.TimeSlotStart)
                    : query.OrderBy(x => x.AppointmentDate).ThenBy(x => x.TimeSlotStart)
            };

            var items = await query
                .Skip((parameters.PageNumber - 1) * parameters.PageSize)
                .Take(parameters.PageSize)
                .ToListAsync(cancellationToken);

            return new PagedResult<Appointment>(items, totalCount, parameters.PageNumber, parameters.PageSize);
        }

        public async Task UpdateAsync(Appointment appointment)
        {
            _context.Appointments.Update(appointment);
            await _context.SaveChangesAsync();
        }

        public async Task SaveStartedExaminationAsync(Appointment appointment, Examination examination, CancellationToken cancellationToken = default)
        {
            // The appointment was loaded without AsNoTracking, so the status change is already tracked
            examination.AppointmentId = appointment.Id;
            await _context.Examinations.AddAsync(examination, cancellationToken);
            try
            {
                await _context.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException ex) when (IsDuplicateExamination(ex))
            {
                // One appointment has one examination. This failed save keeps neither the row nor the status change.
                _context.Entry(examination).State = EntityState.Detached;
                throw new BadRequestException(ErrorConstants.AppointmentMessage.ExaminationAlreadyStarted);
            }
        }

        public async Task AddNotificationAsync(Notification notification, CancellationToken cancellationToken = default)
        {
            await _context.Notifications.AddAsync(notification, cancellationToken);
        }

        private static bool IsDuplicateExamination(DbUpdateException exception)
        {
            return exception.InnerException is SqlException sql
                && (sql.Number == 2601 || sql.Number == 2627)
                && sql.Message.Contains("IX_Examinations_AppointmentId", StringComparison.OrdinalIgnoreCase);
        }
    }
}
