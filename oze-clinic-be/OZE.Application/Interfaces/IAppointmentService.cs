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

        // Today's patients the front desk has to deal with because their doctor ended the shift: the ones waiting in the clinic
        // and the ones booked for a time that is still to come
        Task<List<NeedsAttentionResponse>> GetNeedsAttentionAsync(CancellationToken cancellationToken = default);

        // Moves a waiting patient to another doctor who has a shift to offer today: the patient goes to that doctor's room
        // and gets a new number at the end of that doctor's queue
        Task<AppointmentResponse> ReassignDoctorAsync(long id, ReassignDoctorRequest request, CancellationToken cancellationToken = default);

        // A patient without a booking: finds or creates the patient record by phone, creates the appointment already
        // checked in, sends the patient to the room of the doctor's shift and into the queue
        Task<AppointmentResponse> CreateWalkInAsync(WalkInRequest request, string? createdByUserId, CancellationToken cancellationToken = default);
        // Changes the waiting-list priority of a patient who is checked in and still waiting
        Task<AppointmentResponse> SetPriorityAsync(long id, SetPriorityRequest request, CancellationToken cancellationToken = default);
        // The signed-in doctor opens the visit for one of their checked-in appointments
        Task<StartExaminationResponse> StartExaminationAsync(long id, string doctorUserId, CancellationToken cancellationToken = default);
        // The doctor completes the visit, locking the examination and marking the appointment completed
        Task<AppointmentResponse> CompleteExaminationAsync(long id, string doctorUserId, CancellationToken cancellationToken = default);
    }
}
