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
        // doctorUserId: null for staff (any doctor, or all); for a doctor, their own account id, which limits the list to their own patients
        Task<List<WaitingListItemResponse>> GetWaitingListAsync(int? doctorId, string? doctorUserId, CancellationToken cancellationToken = default);
        Task<PagedResult<AppointmentResponse>> GetMyAppointmentsAsync(AppointmentQueryParameters query, string userId, CancellationToken cancellationToken = default);        // ownerUserId: null for staff; for a patient, the user id that must own the appointment
        Task<AppointmentResponse> GetAppointmentByIdAsync(long id, string? ownerUserId, CancellationToken cancellationToken = default);
        Task<AppointmentResponse> CancelAppointmentAsync(long id, CancelAppointmentRequest request, string? userId, string? ownerUserId, CancellationToken cancellationToken = default);
        // ownerUserId: null for staff; for a patient, the user id that must own the appointment
        Task<AppointmentResponse> RescheduleAppointmentAsync(long id, RescheduleAppointmentRequest request, string? ownerUserId, CancellationToken cancellationToken = default);
        Task<AppointmentResponse> ConfirmAppointmentAsync(long id, CancellationToken cancellationToken = default);
        // request is optional: without it the patient is checked in with normal priority
        Task<AppointmentResponse> CheckInAppointmentAsync(long id, CheckInRequest? request, CancellationToken cancellationToken = default);
        // Changes the waiting-list priority of a patient who is checked in and still waiting
        Task<AppointmentResponse> SetPriorityAsync(long id, SetPriorityRequest request, CancellationToken cancellationToken = default);
    }
}
