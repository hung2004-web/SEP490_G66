using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
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

        public async Task SaveChangesAsync()
        {
            await context.SaveChangesAsync();
        }
    }
}
