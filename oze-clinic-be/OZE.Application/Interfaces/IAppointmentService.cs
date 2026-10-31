using OZE.Common.Models;
using OZE.Common.Models.Base;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace OZE.Application.Interfaces
{
    public interface IAppointmentService
    {
        Task<List<BookableServiceResponse>> GetBookableServicesAsync();
        Task<List<AvailableSlotResponse>> GetAvailableSlotsAsync(AvailableSlotRequest request);
        Task<AppointmentResponse> BookAsGuestAsync(GuestBookingRequest request);
        Task<AppointmentResponse> BookAsPatientAsync(BookingRequest request, string userId);
        Task<PagedResult<AppointmentResponse>> GetAppointmentsAsync(AppointmentQueryParameters query, CancellationToken cancellationToken = default);
        Task<PagedResult<AppointmentResponse>> GetMyAppointmentsAsync(AppointmentQueryParameters query, string userId, CancellationToken cancellationToken = default);        // ownerUserId: null for staff; for a patient, the user id that must own the appointment
        Task<AppointmentResponse> GetAppointmentByIdAsync(long id, string? ownerUserId, CancellationToken cancellationToken = default);
        Task<AppointmentResponse> CancelAppointmentAsync(long id, CancelAppointmentRequest request, string? userId, string? ownerUserId, CancellationToken cancellationToken = default);
        Task<AppointmentResponse> ConfirmAppointmentAsync(long id, CancellationToken cancellationToken = default);
        Task<AppointmentResponse> CheckInAppointmentAsync(long id, CancellationToken cancellationToken = default);
    }
}
