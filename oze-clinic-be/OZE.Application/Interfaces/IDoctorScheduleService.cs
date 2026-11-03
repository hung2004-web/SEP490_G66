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

        // Clock out: the doctor ends a shift of today. A booked patient whose time has passed and who never came is marked NO_SHOW.
        // Patients waiting in the clinic and booked patients whose time is still to come are not marked: they are told by
        // SMS and email and the front desk moves or reschedules them (see the needs-attention list of the appointments).
        Task<EndShiftResponse> EndShiftAsync(string userId, long shiftId);

        // For the manager, when a shift was ended by mistake: only while the shift time is still on and the room is not
        // used by another doctor's running shift. The patients that end marked NO_SHOW are taken back as they were.
        Task<ReopenShiftResponse> ReopenShiftAsync(long shiftId);
    }
}
