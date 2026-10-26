using OZE.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Application.Interfaces
{
    public interface IAppointmentRepository
    {
        Task<List<StaffSchedule>> GetDoctorShiftsAsync(DateOnly date, int? doctorId);
        Task<List<Appointment>> GetActiveAppointmentsAsync(DateOnly date, IReadOnlyCollection<int> doctorIds);
        Task<string?> GetConfigValueAsync(string configKey);
        Task AddPatientAsync(Patient patient);
        Task AddAsync(Appointment appointment);
        Task SaveChangesAsync();
        Task<T> ExecuteSerializableAsync<T>(Func<Task<T>> action);

        Task<List<Appointment>> GetDoctorAppointmentsAsync(int doctorId, DateOnly fromDate, DateOnly toDate);

        Task<List<Service>> GetServicesWithCategoryAsync(IReadOnlyCollection<int> serviceIds);
        Task<List<ServiceCategory>> GetBookableCategoriesAsync();
    }
}
