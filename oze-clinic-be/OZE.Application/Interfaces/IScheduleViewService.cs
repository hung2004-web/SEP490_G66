using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    public interface IScheduleViewService
    {
        Task<List<DoctorOnDutyResponse>> GetDoctorsOnDutyAsync(DoctorsOnDutyQuery query, CancellationToken cancellationToken = default);
        Task<List<WorkShipResponse>> GetMyShiftsAsync(string userId, MyShiftsQuery query, CancellationToken cancellationToken = default);
    }
}
