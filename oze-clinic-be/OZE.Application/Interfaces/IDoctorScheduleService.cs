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

        // Clock in: the doctor starts a shift of today
        Task<DoctorShiftResponse> StartShiftAsync(string userId, long shiftId);

        // Clock out: the doctor ends a shift of today. Patients of the shift who were not examined are marked NO_SHOW
        // (checked in and waiting, or booked and already late); booked patients whose time is still to come are only reported.
        Task<EndShiftResponse> EndShiftAsync(string userId, long shiftId);
    }
}
