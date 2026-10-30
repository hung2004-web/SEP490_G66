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
        Task<List<StaffSchedule>> GetDoctorShiftsAsync(DateOnly date, int? doctorId);
        Task<List<Appointment>> GetActiveAppointmentsAsync(DateOnly date, IReadOnlyCollection<int> doctorIds);
        Task<string?> GetConfigValueAsync(string configKey);
        Task AddPatientAsync(Patient patient);
        Task<Patient?> GetPatientByUserIdAsync(string userId);
        Task AddAsync(Appointment appointment);
        Task SaveChangesAsync();
        Task<T> ExecuteSerializableAsync<T>(Func<Task<T>> action);

        Task<List<Appointment>> GetDoctorAppointmentsAsync(int doctorId, DateOnly fromDate, DateOnly toDate);

        Task<List<Service>> GetServicesByIdsAsync(IReadOnlyCollection<int> serviceIds);
        Task<List<ServiceVariant>> GetVariantsByIdsAsync(IReadOnlyCollection<int> variantIds);
        Task<List<Service>> GetBookableServicesAsync();

        Task<Appointment?> GetByIdWithDetailsAsync(long id, CancellationToken cancellationToken = default);
        Task<PagedResult<Appointment>> GetAppointmentsAsync(AppointmentQueryParameters parameters, CancellationToken cancellationToken = default);
        Task UpdateAsync(Appointment appointment);
    }
}
