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
    
    public class WorkShiftRepository : IWorkShiftRepository
    {
        private readonly AppIdentityDbContext context;
        public WorkShiftRepository(AppIdentityDbContext _context)
        {
            context = _context;
        }
            public async Task AddAsync(StaffSchedule schedule)
        {
             await context.StaffSchedules.AddAsync(schedule);
        }

        public async Task<List<StaffSchedule>> GetAllAsync(DateOnly fromDate, DateOnly toDate, string? staffUserId, int? roomId)
        {
            var shifts = context.StaffSchedules
                .AsNoTracking()
                .Include(x => x.StaffProfile)
                .Include(x => x.Room)
                .Where(x => x.ScheduleDate >= fromDate && x.ScheduleDate <= toDate);

            if (!string.IsNullOrWhiteSpace(staffUserId))
            {
                shifts = shifts.Where(x => x.StaffProfile.UserId == staffUserId);
            }

            if (roomId.HasValue)
            {
                shifts = shifts.Where(x => x.RoomId == roomId);
            }

            return await shifts
                .OrderBy(x => x.ScheduleDate)
                .ThenBy(x => x.ShiftStart)
                .ToListAsync();
        }

        public async Task<StaffSchedule?> GetByIdAsync(long id)
        {
            return await context.StaffSchedules
                .Include(x => x.StaffProfile)
                .Include(x => x.Room)
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public Task<string?> GetConfigValueAsync(string configKey)
        {
            throw new NotImplementedException();
        }
            
        public async Task<bool> HasOverlapAsync(int staffProfileId, DateOnly scheduleDate, TimeOnly shiftStart, TimeOnly shiftEnd, long? excludeShiftId = null)
        {
            return await context.StaffSchedules.AnyAsync(x =>
                x.StaffProfileId == staffProfileId
                && x.ScheduleDate == scheduleDate
                && x.Id != excludeShiftId
                && x.ShiftStart < shiftEnd
                && shiftStart < x.ShiftEnd);
        }

        public async Task<bool> HasBookedAppointmentsAsync(int staffProfileId, DateOnly scheduleDate, TimeOnly shiftStart, TimeOnly shiftEnd)
        {
            // An appointment belongs to the shift when its time slot overlaps the shift time
            return await context.Appointments.AnyAsync(x =>
                x.DoctorId == staffProfileId
                && x.AppointmentDate == scheduleDate
                && x.Status != AppointmentConstants.CancelledStatus
                && x.Status != AppointmentConstants.NoShowStatus
                && x.TimeSlotStart < shiftEnd
                && shiftStart < x.TimeSlotEnd);
        }

        public void Remove(StaffSchedule schedule)
        {
            context.StaffSchedules.Remove(schedule);
        }

        public async Task SaveChangesAsync()
        {
            await context.SaveChangesAsync();
        }
    }
}
