using OZE.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Application.Interfaces
{
    public interface IWorkShiftRepository
    {
        Task<bool> HasOverlapAsync(int staffProfileId, DateOnly scheduleDate, TimeOnly shiftStart, TimeOnly shiftEnd, long? excludeShiftId = null);
        Task<string?> GetConfigValueAsync(string configKey);
        Task AddAsync(StaffSchedule schedule);
        Task SaveChangesAsync();
        Task<List<StaffSchedule>> GetAllAsync(DateOnly fromDate, DateOnly toDate, string? staffUserId, int? roomId);
        Task<StaffSchedule?> GetByIdAsync(long id);
        Task<bool> HasBookedAppointmentsAsync(int staffProfileId, DateOnly scheduleDate, TimeOnly shiftStart, TimeOnly shiftEnd);
        void Update(StaffSchedule schedule);
        void Remove(StaffSchedule schedule);
    }
}
