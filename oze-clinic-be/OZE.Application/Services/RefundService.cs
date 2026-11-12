using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    public class RefundService : IRefundService
    {
        private readonly IRefundRepository _refundRepository;
        private readonly IInvoiceRepository _invoiceRepository;
        private readonly IAuditLogService _auditLogService;

        public RefundService(
            IRefundRepository refundRepository,
            IInvoiceRepository invoiceRepository,
            IAuditLogService auditLogService)
        {
            _refundRepository = refundRepository;
            _invoiceRepository = invoiceRepository;
            _auditLogService = auditLogService;
        }

        public Task<RefundRequestResponse> RequestAsync(
            long invoiceId,
            string requestedByUserId,
            CreateRefundRequest request,
            CancellationToken cancellationToken = default)
        {
            return _refundRepository.ExecuteInTransactionAsync(async () =>
            {
                var reason = request.Reason?.Trim() ?? string.Empty;
                ConditionGuard.Ensure(reason.Length > 0, ErrorConstants.RefundMessage.ReasonRequired);

                var invoice = await _invoiceRepository.GetByIdWithDetailsAsync(invoiceId, cancellationToken);
                ConditionGuard.Ensure<NotFoundException>(invoice != null, ErrorConstants.RefundMessage.InvoiceNotFound);
                EnsureInvoiceRefundable(invoice!);

                ConditionGuard.ThrowIf(
                    await _refundRepository.HasPendingForInvoiceAsync(invoiceId, cancellationToken),
                    ErrorConstants.RefundMessage.PendingRequestExists);

                var netPaid = InvoiceMoneyHelper.GetNetPaidAmount(invoice!);
                ConditionGuard.Ensure(netPaid > 0, ErrorConstants.RefundMessage.NoConfirmedPayments);

                long? paymentId = null;
                if (request.PaymentId.HasValue)
                {
                    var payment = invoice!.Payments.FirstOrDefault(p => p.Id == request.PaymentId.Value);
                    ConditionGuard.Ensure(
                        payment != null && payment.PaymentStatus == PaymentConstants.Confirmed,
                        ErrorConstants.RefundMessage.PaymentInvalid);
                    paymentId = payment!.Id;
                }

                var now = DateTimeOffset.UtcNow;
                var refundRequest = new RefundAdjustmentRequest
                {
                    InvoiceId = invoice!.Id,
                    PaymentId = paymentId,
                    RequestType = PaymentConstants.RefundRequestType.Refund,
                    // Provisional: full net paid until Manager sets WorkDone and approves
                    Amount = netPaid,
                    Reason = reason,
                    Status = PaymentConstants.RefundRequestStatus.Pending,
                    RequestedByUserId = requestedByUserId,
                    CreatedAt = now
                };

                await _refundRepository.AddAsync(refundRequest, cancellationToken);
                invoice.RefundAdjustmentRequests.Add(refundRequest);
                invoice.UpdatedAt = now;
                _invoiceRepository.Update(invoice);
                await _refundRepository.SaveChangesAsync(cancellationToken);

                await SafeAuditAsync(
                    AuditConstants.RefundRequested,
                    refundRequest.Id.ToString(),
                    null,
                    new
                    {
                        refundRequest.InvoiceId,
                        refundRequest.Amount,
                        refundRequest.PaymentId,
                        requestedByUserId
                    });

                return ToResponse(refundRequest, invoice);
            }, cancellationToken);
        }

        public async Task<IReadOnlyList<RefundRequestResponse>> GetListAsync(
            RefundRequestQueryParameters parameters,
            CancellationToken cancellationToken = default)
        {
            string? status = null;
            if (!string.IsNullOrWhiteSpace(parameters.Status))
            {
                status = NormalizeStatus(parameters.Status);
            }

            var items = await _refundRepository.GetListAsync(status, parameters.InvoiceId, cancellationToken);
            return items.Select(r => ToResponse(r, r.Invoice)).ToList();
        }

        public Task<RefundRequestResponse> SetWorkDoneAsync(
            long requestId,
            string managerUserId,
            SetWorkDoneAmountRequest request,
            CancellationToken cancellationToken = default)
        {
            return _refundRepository.ExecuteInTransactionAsync(async () =>
            {
                var refundRequest = await _refundRepository.GetByIdWithInvoiceAsync(requestId, cancellationToken);
                ConditionGuard.Ensure<NotFoundException>(
                    refundRequest != null,
                    ErrorConstants.RefundMessage.RequestNotFound);

                ConditionGuard.Ensure(
                    refundRequest!.Status == PaymentConstants.RefundRequestStatus.Pending,
                    ErrorConstants.RefundMessage.RequestNotPending);

                var invoice = refundRequest.Invoice;
                var netPaid = InvoiceMoneyHelper.GetNetPaidAmount(invoice);
                var workDone = decimal.Round(request.WorkDoneAmount, 2, MidpointRounding.AwayFromZero);
                ConditionGuard.Ensure(workDone >= 0, ErrorConstants.RefundMessage.WorkDoneAmountInvalid);
                // Must leave a positive refund amount (CK_RefundAdjustments_Amount: Amount > 0)
                ConditionGuard.Ensure(workDone < netPaid, ErrorConstants.RefundMessage.WorkDoneExceedsPaid);

                refundRequest.WorkDoneAmount = workDone;
                refundRequest.UpdatedAt = DateTimeOffset.UtcNow;
                invoice.UpdatedAt = refundRequest.UpdatedAt;
                _invoiceRepository.Update(invoice);
                await _refundRepository.SaveChangesAsync(cancellationToken);

                await SafeAuditAsync(
                    AuditConstants.RefundWorkDoneSet,
                    refundRequest.Id.ToString(),
                    null,
                    new { refundRequest.InvoiceId, workDone, netPaid, managerUserId });

                return ToResponse(refundRequest, invoice);
            }, cancellationToken);
        }

        public Task<RefundRequestResponse> ApproveAsync(
            long requestId,
            string approvedByUserId,
            CancellationToken cancellationToken = default)
        {
            return _refundRepository.ExecuteInTransactionAsync(async () =>
            {
                var refundRequest = await _refundRepository.GetByIdWithInvoiceAsync(requestId, cancellationToken);
                ConditionGuard.Ensure<NotFoundException>(
                    refundRequest != null,
                    ErrorConstants.RefundMessage.RequestNotFound);

                ConditionGuard.Ensure(
                    refundRequest!.Status == PaymentConstants.RefundRequestStatus.Pending,
                    ErrorConstants.RefundMessage.RequestNotPending);

                ConditionGuard.Ensure(
                    refundRequest.WorkDoneAmount.HasValue,
                    ErrorConstants.RefundMessage.WorkDoneAmountRequired);

                var invoice = refundRequest.Invoice;
                // Net before this pending request (pending Amount is provisional and not counted)
                var netPaid = InvoiceMoneyHelper.GetNetPaidAmount(invoice);
                var workDone = decimal.Round(refundRequest.WorkDoneAmount!.Value, 2, MidpointRounding.AwayFromZero);
                ConditionGuard.Ensure(workDone >= 0, ErrorConstants.RefundMessage.WorkDoneAmountInvalid);
                ConditionGuard.Ensure(workDone < netPaid, ErrorConstants.RefundMessage.WorkDoneExceedsPaid);

                var refundAmount = decimal.Round(netPaid - workDone, 2, MidpointRounding.AwayFromZero);

                var now = DateTimeOffset.UtcNow;
                refundRequest.Amount = refundAmount;
                refundRequest.Status = PaymentConstants.RefundRequestStatus.Processed;
                refundRequest.ApprovedByUserId = string.IsNullOrWhiteSpace(approvedByUserId) ? null : approvedByUserId;
                refundRequest.ApprovedAt = now;
                refundRequest.ProcessedAt = now;
                refundRequest.UpdatedAt = now;

                InvoiceMoneyHelper.Recalculate(invoice);
                invoice.UpdatedAt = now;
                _invoiceRepository.Update(invoice);
                await _refundRepository.SaveChangesAsync(cancellationToken);

                await SafeAuditAsync(
                    AuditConstants.RefundApproved,
                    refundRequest.Id.ToString(),
                    null,
                    new
                    {
                        refundRequest.InvoiceId,
                        refundRequest.Amount,
                        refundRequest.WorkDoneAmount,
                        invoice.PaidAmount,
                        invoice.PaymentStatus,
                        approvedByUserId
                    });

                await SafeAuditAsync(
                    AuditConstants.RefundProcessed,
                    refundRequest.Id.ToString(),
                    null,
                    new { refundRequest.InvoiceId, refundRequest.Amount, refundRequest.ProcessedAt });

                return ToResponse(refundRequest, invoice);
            }, cancellationToken);
        }

        public Task<RefundRequestResponse> RejectAsync(
            long requestId,
            string rejectedByUserId,
            RejectRefundRequest request,
            CancellationToken cancellationToken = default)
        {
            return _refundRepository.ExecuteInTransactionAsync(async () =>
            {
                var rejectionReason = request.RejectionReason?.Trim() ?? string.Empty;
                ConditionGuard.Ensure(
                    rejectionReason.Length > 0,
                    ErrorConstants.RefundMessage.RejectionReasonRequired);

                var refundRequest = await _refundRepository.GetByIdWithInvoiceAsync(requestId, cancellationToken);
                ConditionGuard.Ensure<NotFoundException>(
                    refundRequest != null,
                    ErrorConstants.RefundMessage.RequestNotFound);

                ConditionGuard.Ensure(
                    refundRequest!.Status == PaymentConstants.RefundRequestStatus.Pending,
                    ErrorConstants.RefundMessage.RequestNotPending);

                var now = DateTimeOffset.UtcNow;
                refundRequest.Status = PaymentConstants.RefundRequestStatus.Rejected;
                refundRequest.RejectionReason = rejectionReason;
                refundRequest.ApprovedByUserId = string.IsNullOrWhiteSpace(rejectedByUserId) ? null : rejectedByUserId;
                refundRequest.ApprovedAt = now;
                refundRequest.UpdatedAt = now;

                var invoice = refundRequest.Invoice;
                invoice.UpdatedAt = now;
                _invoiceRepository.Update(invoice);
                await _refundRepository.SaveChangesAsync(cancellationToken);

                await SafeAuditAsync(
                    AuditConstants.RefundRejected,
                    refundRequest.Id.ToString(),
                    null,
                    new
                    {
                        refundRequest.InvoiceId,
                        rejectionReason,
                        rejectedByUserId
                    });

                return ToResponse(refundRequest, invoice);
            }, cancellationToken);
        }

        private static void EnsureInvoiceRefundable(Invoice invoice)
        {
            ConditionGuard.ThrowIf(
                invoice.PaymentStatus == InvoiceConstants.Cancelled
                || invoice.PaymentStatus == InvoiceConstants.Refunded,
                ErrorConstants.RefundMessage.InvoiceNotRefundable);
        }

        private static string NormalizeStatus(string status)
        {
            var trimmed = status.Trim();
            var match = PaymentConstants.RefundRequestStatus.All.FirstOrDefault(s =>
                string.Equals(s, trimmed, StringComparison.OrdinalIgnoreCase));
            ConditionGuard.Ensure(match != null, ErrorConstants.RefundMessage.StatusInvalid);
            return match!;
        }

        private async Task SafeAuditAsync(string action, string entityId, object? oldValues, object? newValues)
        {
            try
            {
                await _auditLogService.LogAsync(
                    action,
                    AuditConstants.RefundRequestEntity,
                    entityId,
                    oldValues,
                    newValues);
            }
            catch
            {
                // Audit must never fail the business operation.
            }
        }

        private static RefundRequestResponse ToResponse(RefundAdjustmentRequest request, Invoice? invoice)
        {
            return new RefundRequestResponse
            {
                Id = request.Id,
                InvoiceId = request.InvoiceId,
                InvoiceNumber = invoice?.InvoiceNumber,
                PaymentId = request.PaymentId,
                RequestType = request.RequestType,
                Amount = request.Amount,
                WorkDoneAmount = request.WorkDoneAmount,
                Reason = request.Reason,
                Status = request.Status,
                RequestedByUserId = request.RequestedByUserId,
                ApprovedByUserId = request.ApprovedByUserId,
                ApprovedAt = request.ApprovedAt,
                RejectionReason = request.RejectionReason,
                ProcessedAt = request.ProcessedAt,
                CreatedAt = request.CreatedAt,
                InvoicePaidAmount = invoice?.PaidAmount,
                InvoicePaymentStatus = invoice?.PaymentStatus,
                PatientName = invoice?.Patient?.FullName,
                PatientCode = invoice?.Patient?.PatientCode,
                ServiceNames = invoice?.Items is { Count: > 0 } items ? string.Join(" · ", items.Select(i => i.ServiceName)) : null
            };
        }
    }
}
