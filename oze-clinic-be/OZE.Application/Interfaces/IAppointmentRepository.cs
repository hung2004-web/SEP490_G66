using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace OZE.Application.Interfaces
{
    public interface IAppointmentRepository
    {
        // Shifts still open: a shift the doctor has ended is not offered any more
        Task<List<StaffSchedule>> GetDoctorShiftsAsync(DateOnly date, int? doctorId);
        // True when the doctor has ended a shift on that date
        Task<bool> HasEndedShiftAsync(int doctorId, DateOnly date);
        Task<List<Appointment>> GetActiveAppointmentsAsync(DateOnly date, IReadOnlyCollection<int> doctorIds);
        Task<string?> GetConfigValueAsync(string configKey);
        Task AddPatientAsync(Patient patient);
        Task<Patient?> GetPatientByUserIdAsync(string userId);        Task AddAsync(Appointment appointment);
        Task SaveChangesAsync();
        Task<T> ExecuteSerializableAsync<T>(Func<Task<T>> action);

        Task<List<Appointment>> GetDoctorAppointmentsAsync(int doctorId, DateOnly fromDate, DateOnly toDate);

        Task<List<Service>> GetServicesByIdsAsync(IReadOnlyCollection<int> serviceIds);
        Task<List<ServiceVariant>> GetVariantsByIdsAsync(IReadOnlyCollection<int> variantIds);
        Task<List<Service>> GetBookableServicesAsync();

        // Checked-in appointments of one day, all doctors when doctorId is null
        Task<List<Appointment>> GetWaitingAppointmentsAsync(DateOnly date, int? doctorId, CancellationToken cancellationToken = default);
        Task<int?> GetStaffProfileIdByUserIdAsync(string userId);
        Task<Appointment?> GetByIdWithDetailsAsync(long id, CancellationToken cancellationToken = default);
        // Same as GetByIdWithDetailsAsync plus the examination of the appointment (tracked, so it can be updated)
        Task<Appointment?> GetByIdWithExaminationAsync(long id, CancellationToken cancellationToken = default);
        // Shifts of that day the doctor has ended
        Task<List<StaffSchedule>> GetEndedShiftsAsync(DateOnly date);
        // Appointments of these doctors on one day in these statuses, with the patient, the doctor, the examination and the queue entries
        Task<List<Appointment>> GetAppointmentsOfDoctorsAsync(DateOnly date, IReadOnlyCollection<int> doctorIds, IReadOnlyCollection<string> statuses);
        // Pending, confirmed, checked-in and in-service appointments of the doctor on one day, with the patient and the examination (tracked, so they can be updated)
        Task<List<Appointment>> GetDoctorOpenAppointmentsAsync(int doctorId, DateOnly date, CancellationToken cancellationToken = default);
        // True when the doctor already has a patient being examined (IN_SERVICE) on that date
        Task<bool> HasAppointmentInServiceAsync(int doctorId, DateOnly date);
        // True when the patient has an appointment of today or later that is not finished yet
        Task<bool> HasUnfinishedAppointmentAsync(int patientId, long? excludeAppointmentId = null);
        Task<PagedResult<Appointment>> GetAppointmentsAsync(AppointmentQueryParameters parameters, CancellationToken cancellationToken = default);
        Task UpdateAsync(Appointment appointment);

        // The appointment is already tracked. The examination insert and the status change are one save.
        // What an examination holds when the doctor completes it
        Task<(int Diagnoses, int DraftPrescriptionsWithItems)> GetExaminationCompletionCountsAsync(long examinationId, CancellationToken cancellationToken = default);
        // A draft prescription with no medication is only a leftover
        Task RemoveEmptyDraftPrescriptionsAsync(long examinationId, CancellationToken cancellationToken = default);
        Task SaveStartedExaminationAsync(Appointment appointment, Examination examination, CancellationToken cancellationToken = default);
        Task AddNotificationAsync(Notification notification, CancellationToken cancellationToken = default);
    }
}
