using OZE.Common.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Application.Interfaces
{
    public interface IDoctorScheduleService 
    {
        Task<List<DoctorShiftResponse>> GetMyScheduleAsync(string userId, DoctorScheduleQueryRequest query);
        Task<DoctorShiftResponse> GetMyShiftDetailAsync(string userId, long shiftId);
    }
}
