using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface ILeaveRequestRepository
    {
        Task AddAsync(LeaveRequest request, CancellationToken cancellationToken = default);
        Task<LeaveRequest?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
        Task<PagedResult<LeaveRequest>> GetPagedAsync(LeaveRequestQuery query, int? staffProfileId, CancellationToken cancellationToken = default);

        // A Pending or Approved request of the staff member that covers any part of that slot
        Task<bool> HasActiveOverlapAsync(int staffProfileId, DateOnly date, string? slot, long? excludeId = null, CancellationToken cancellationToken = default);
        Task<List<LeaveRequest>> GetApprovedOnDateAsync(DateOnly date, CancellationToken cancellationToken = default);

        // Tracked shifts of the staff member on that day, with the room
        Task<List<StaffSchedule>> GetShiftsOnDateAsync(int staffProfileId, DateOnly date, CancellationToken cancellationToken = default);
        // Unfinished appointments of the doctor on that day, with patient and services
        Task<List<Appointment>> GetOpenAppointmentsOnDateAsync(int doctorId, DateOnly date, CancellationToken cancellationToken = default);

        Task<Dictionary<string, string>> GetRolesAsync(IEnumerable<string> userIds, CancellationToken cancellationToken = default);
        Task<List<StaffProfile>> GetActiveStaffInRoleAsync(string role, CancellationToken cancellationToken = default);

        Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> action, CancellationToken cancellationToken = default);
        Task SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
