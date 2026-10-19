using OZE.Common.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Application.Interfaces
{
    public interface IAppointmentService
    {
        Task<List<AvailableSlotResponse>> GetAvailableSlotsAsync(AvailableSlotRequest request);
        Task<AppointmentResponse> BookAsGuestAsync(GuestBookingRequest request);
    }
}
