using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;
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

        public async Task<T> ExecuteSerializableAsync<T>(Func<Task<T>> action)
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
    }
}
