using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    public interface IPaymentService
    {
        Task<PaymentResponse> RecordAsync(
            long invoiceId,
            string recordedByUserId,
            RecordPaymentRequest request,
            CancellationToken cancellationToken = default);

        Task<PaymentResponse> ConfirmAsync(
            long paymentId,
            string confirmedByUserId,
            CancellationToken cancellationToken = default);

        Task<PaymentResponse> VoidAsync(
            long paymentId,
            string voidedByUserId,
            CancellationToken cancellationToken = default);
    }
}
