using OZE.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Application.Interfaces
{
    public interface IWorkShipRepository
    {
        Task<bool> HasOverlapAsync(int staffProfileId, DateOnly scheduleDate, TimeOnly shiftStart, TimeOnly shiftEnd, long? excludeShiftId = null);
        Task<string?> GetConfigValueAsync(string configKey);
        Task AddAsync(StaffSchedule schedule);
        Task SaveChangesAsync();
    }
}
