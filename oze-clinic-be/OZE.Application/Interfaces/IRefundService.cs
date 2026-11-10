using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    public interface IRefundService
    {
        Task<RefundRequestResponse> RequestAsync(
            long invoiceId,
            string requestedByUserId,
            CreateRefundRequest request,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<RefundRequestResponse>> GetListAsync(
            RefundRequestQueryParameters parameters,
            CancellationToken cancellationToken = default);

        Task<RefundRequestResponse> SetWorkDoneAsync(
            long requestId,
            string managerUserId,
            SetWorkDoneAmountRequest request,
            CancellationToken cancellationToken = default);

        Task<RefundRequestResponse> ApproveAsync(
            long requestId,
            string approvedByUserId,
            CancellationToken cancellationToken = default);

        Task<RefundRequestResponse> RejectAsync(
            long requestId,
            string rejectedByUserId,
            RejectRefundRequest request,
            CancellationToken cancellationToken = default);
    }
}
