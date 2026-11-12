using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Application.Interfaces
{
    public interface ILeaveRequestService
    {
        Task<LeaveRequestResponse> CreateAsync(string userId, CreateLeaveRequestRequest request, CancellationToken cancellationToken = default);
        Task<PagedResult<LeaveRequestResponse>> GetMineAsync(string userId, LeaveRequestQuery query, CancellationToken cancellationToken = default);
        Task<LeaveRequestResponse> CancelAsync(string userId, long id, CancellationToken cancellationToken = default);

        Task<PagedResult<LeaveRequestResponse>> GetPagedAsync(LeaveRequestQuery query, CancellationToken cancellationToken = default);
        Task<LeaveRequestDetailResponse> GetDetailAsync(long id, CancellationToken cancellationToken = default);
        Task<LeaveRequestResponse> ApproveAsync(string managerUserId, long id, ApproveLeaveRequestRequest request, CancellationToken cancellationToken = default);
        Task<LeaveRequestResponse> RejectAsync(string managerUserId, long id, RejectLeaveRequestRequest request, CancellationToken cancellationToken = default);
    }
}
