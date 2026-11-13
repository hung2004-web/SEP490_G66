using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    public class PaymentService : IPaymentService
    {
        private readonly IPaymentRepository _paymentRepository;
        private readonly IInvoiceRepository _invoiceRepository;
        private readonly IAuditLogService _auditLogService;

        public PaymentService(
            IPaymentRepository paymentRepository,
            IInvoiceRepository invoiceRepository,
            IAuditLogService auditLogService)
        {
            _paymentRepository = paymentRepository;
            _invoiceRepository = invoiceRepository;
            _auditLogService = auditLogService;
        }

        public Task<PaymentResponse> RecordAsync(
            long invoiceId,
            string recordedByUserId,
            RecordPaymentRequest request,
            CancellationToken cancellationToken = default)
        {
            return _paymentRepository.ExecuteInTransactionAsync(async () =>
            {
                var invoice = await _invoiceRepository.GetByIdWithDetailsAsync(invoiceId, cancellationToken);
                ConditionGuard.Ensure<NotFoundException>(invoice != null, ErrorConstants.PaymentMessage.InvoiceNotFound);
                var payableInvoice = invoice!;
                EnsureInvoicePayable(payableInvoice);

                var method = NormalizeMethod(request.PaymentMethod);
                var purpose = NormalizePurpose(request.Purpose);
                var amount = decimal.Round(request.Amount, 2, MidpointRounding.AwayFromZero);
                ConditionGuard.Ensure(amount > 0, ErrorConstants.PaymentMessage.AmountInvalid);

                long? periodId = null;
                if (purpose == PaymentConstants.PurposeInstallment)
                {
                    ConditionGuard.Ensure(request.InstallmentPeriodId.HasValue, ErrorConstants.PaymentMessage.InstallmentPeriodRequired);
                    periodId = request.InstallmentPeriodId;
                    EnsureInstallmentPeriodPayable(payableInvoice, periodId!.Value);
                }
                else
                {
                    ConditionGuard.ThrowIf(
                        request.InstallmentPeriodId.HasValue,
                        ErrorConstants.PaymentMessage.InstallmentPeriodInvalid);
                }

                // Open-P1: CASH → CONFIRMED ngay; BANK/QR → PENDING
                var isCash = method == PaymentConstants.Cash;
                var status = isCash ? PaymentConstants.Confirmed : PaymentConstants.Pending;

                if (status == PaymentConstants.Confirmed)
                {
                    EnsureNotOverpay(payableInvoice, amount);
                }

                var now = DateTimeOffset.UtcNow;
                var payment = new Payment
                {
                    InvoiceId = payableInvoice.Id,
                    Amount = amount,
                    PaymentMethod = method,
                    Purpose = purpose,
                    PaymentStatus = status,
                    TransactionReference = string.IsNullOrWhiteSpace(request.TransactionReference)
                        ? null
                        : request.TransactionReference.Trim(),
                    InstallmentPeriodId = periodId,
                    Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
                    CreatedAt = now,
                    PaidAt = isCash ? now : null,
                    ConfirmedByUserId = isCash
                        ? (string.IsNullOrWhiteSpace(recordedByUserId) ? null : recordedByUserId)
                        : null
                };

                await _paymentRepository.AddAsync(payment, cancellationToken);
                // AddAsync already attaches the payment to the tracked invoice; adding it again counted it twice in PaidAmount
                if (!payableInvoice.Payments.Contains(payment))
                {
                    payableInvoice.Payments.Add(payment);
                }

                if (isCash)
                {
                    ApplyConfirmedPaymentEffects(payableInvoice, payment, now);
                }

                RecalculateInvoiceMoney(payableInvoice);
                payableInvoice.UpdatedAt = now;
                _invoiceRepository.Update(payableInvoice);
                await _paymentRepository.SaveChangesAsync(cancellationToken);

                await SafeAuditAsync(
                    AuditConstants.PaymentRecorded,
                    payment.Id.ToString(),
                    null,
                    new { payment.InvoiceId, payment.Amount, payment.PaymentMethod, payment.Purpose, payment.PaymentStatus, recordedByUserId });

                return ToResponse(payment, payableInvoice);
            }, cancellationToken);
        }

        public Task<PaymentResponse> ConfirmAsync(
            long paymentId,
            string confirmedByUserId,
            CancellationToken cancellationToken = default)
        {
            return _paymentRepository.ExecuteInTransactionAsync(async () =>
            {
                var payment = await _paymentRepository.GetByIdWithInvoiceAsync(paymentId, cancellationToken);
                ConditionGuard.Ensure<NotFoundException>(payment != null, ErrorConstants.PaymentMessage.PaymentNotFound);

                var invoice = payment!.Invoice;
                EnsureInvoicePayable(invoice);

                ConditionGuard.Ensure(
                    payment.PaymentStatus == PaymentConstants.Pending,
                    ErrorConstants.PaymentMessage.PaymentNotPending);

                EnsureNotOverpay(invoice, payment.Amount);

                var now = DateTimeOffset.UtcNow;
                payment.PaymentStatus = PaymentConstants.Confirmed;
                payment.PaidAt = now;
                payment.ConfirmedByUserId = string.IsNullOrWhiteSpace(confirmedByUserId) ? null : confirmedByUserId;

                ApplyConfirmedPaymentEffects(invoice, payment, now);
                RecalculateInvoiceMoney(invoice);
                invoice.UpdatedAt = now;
                _invoiceRepository.Update(invoice);
                await _paymentRepository.SaveChangesAsync(cancellationToken);

                await SafeAuditAsync(
                    AuditConstants.PaymentConfirmed,
                    payment.Id.ToString(),
                    null,
                    new { payment.InvoiceId, payment.Amount, confirmedByUserId });

                return ToResponse(payment, invoice);
            }, cancellationToken);
        }

        public Task<PaymentResponse> VoidAsync(
            long paymentId,
            string voidedByUserId,
            CancellationToken cancellationToken = default)
        {
            return _paymentRepository.ExecuteInTransactionAsync(async () =>
            {
                var payment = await _paymentRepository.GetByIdWithInvoiceAsync(paymentId, cancellationToken);
                ConditionGuard.Ensure<NotFoundException>(payment != null, ErrorConstants.PaymentMessage.PaymentNotFound);

                var invoice = payment!.Invoice;
                ConditionGuard.ThrowIf(
                    invoice.PaymentStatus == InvoiceConstants.Cancelled,
                    ErrorConstants.PaymentMessage.InvoiceNotPayable);

                ConditionGuard.Ensure(
                    payment.PaymentStatus == PaymentConstants.Confirmed,
                    ErrorConstants.PaymentMessage.PaymentNotVoidable);

                payment.PaymentStatus = PaymentConstants.Failed;
                ClearInstallmentPeriodLink(invoice, payment);

                RecalculateInvoiceMoney(invoice);
                invoice.UpdatedAt = DateTimeOffset.UtcNow;
                _invoiceRepository.Update(invoice);
                await _paymentRepository.SaveChangesAsync(cancellationToken);

                await SafeAuditAsync(
                    AuditConstants.PaymentVoided,
                    payment.Id.ToString(),
                    null,
                    new { payment.InvoiceId, payment.Amount, voidedByUserId });

                return ToResponse(payment, invoice);
            }, cancellationToken);
        }

        private static void EnsureInvoicePayable(Invoice invoice)
        {
            ConditionGuard.ThrowIf(
                invoice.PaymentStatus == InvoiceConstants.Cancelled
                || invoice.PaymentStatus == InvoiceConstants.Refunded
                || invoice.PaymentStatus == InvoiceConstants.PartiallyRefunded,
                ErrorConstants.PaymentMessage.InvoiceNotPayable);
        }

        private static string NormalizeMethod(string? method)
        {
            var normalized = method?.Trim().ToUpperInvariant() ?? string.Empty;
            ConditionGuard.Ensure(
                PaymentConstants.Methods.Contains(normalized),
                ErrorConstants.PaymentMessage.MethodInvalid);
            return normalized;
        }

        private static string NormalizePurpose(string? purpose)
        {
            // Purpose values are PascalCase (Deposit|Regular|Installment)
            var trimmed = purpose?.Trim() ?? string.Empty;
            var match = PaymentConstants.Purposes.FirstOrDefault(p =>
                string.Equals(p, trimmed, StringComparison.OrdinalIgnoreCase));
            ConditionGuard.Ensure(match != null, ErrorConstants.PaymentMessage.PurposeInvalid);
            return match!;
        }

        private static void EnsureNotOverpay(Invoice invoice, decimal amount)
        {
            var remaining = GetRemaining(invoice);
            ConditionGuard.Ensure(amount <= remaining, ErrorConstants.PaymentMessage.AmountExceedsRemaining);
        }

        private static decimal GetRemaining(Invoice invoice) => InvoiceMoneyHelper.GetRemaining(invoice);

        private static void EnsureInstallmentPeriodPayable(Invoice invoice, long periodId)
        {
            var period = invoice.InstallmentPlans
                .SelectMany(p => p.Periods)
                .FirstOrDefault(p => p.Id == periodId);
            ConditionGuard.Ensure<NotFoundException>(period != null, ErrorConstants.PaymentMessage.InstallmentPeriodInvalid);
            ConditionGuard.Ensure(
                period!.Status == InstallmentConstants.PeriodPending
                || period.Status == InstallmentConstants.PeriodOverdue,
                ErrorConstants.PaymentMessage.InstallmentPeriodInvalid);
            ConditionGuard.Ensure(period.PaymentId is null, ErrorConstants.PaymentMessage.InstallmentPeriodInvalid);
        }

        private static void ApplyConfirmedPaymentEffects(Invoice invoice, Payment payment, DateTimeOffset now)
        {
            if (payment.Purpose != PaymentConstants.PurposeInstallment || !payment.InstallmentPeriodId.HasValue)
            {
                return;
            }

            var period = invoice.InstallmentPlans
                .SelectMany(p => p.Periods)
                .FirstOrDefault(p => p.Id == payment.InstallmentPeriodId.Value);
            if (period is null)
            {
                return;
            }

            period.Status = InstallmentConstants.PeriodPaid;
            period.PaidAt = now;
            period.Payment = payment;
            payment.InstallmentPeriod = period;
        }

        private static void ClearInstallmentPeriodLink(Invoice invoice, Payment payment)
        {
            if (!payment.InstallmentPeriodId.HasValue)
            {
                return;
            }

            var period = invoice.InstallmentPlans
                .SelectMany(p => p.Periods)
                .FirstOrDefault(p => p.Id == payment.InstallmentPeriodId.Value)
                ?? payment.InstallmentPeriod;

            if (period is null)
            {
                return;
            }

            if (period.PaymentId == payment.Id || period.PaymentId is null)
            {
                period.PaymentId = null;
                period.PaidAt = null;
                period.Status = period.DueDate < DateOnly.FromDateTime(DateTime.UtcNow)
                    ? InstallmentConstants.PeriodOverdue
                    : InstallmentConstants.PeriodPending;
            }
        }

        private static void RecalculateInvoiceMoney(Invoice invoice) => InvoiceMoneyHelper.Recalculate(invoice);

        private async Task SafeAuditAsync(string action, string entityId, object? oldValues, object? newValues)
        {
            try
            {
                await _auditLogService.LogAsync(action, AuditConstants.PaymentEntity, entityId, oldValues, newValues);
            }
            catch
            {
                // Audit must never fail the business operation.
            }
        }

        private static PaymentResponse ToResponse(Payment payment, Invoice invoice)
        {
            var remaining = decimal.Round(Math.Max(0m, invoice.FinalAmount - invoice.PaidAmount), 2, MidpointRounding.AwayFromZero);
            return new PaymentResponse
            {
                Id = payment.Id,
                InvoiceId = payment.InvoiceId,
                Amount = payment.Amount,
                PaymentMethod = payment.PaymentMethod,
                PaymentStatus = payment.PaymentStatus,
                Purpose = payment.Purpose,
                TransactionReference = payment.TransactionReference,
                InstallmentPeriodId = payment.InstallmentPeriodId,
                Notes = payment.Notes,
                CreatedAt = payment.CreatedAt,
                PaidAt = payment.PaidAt,
                ConfirmedByUserId = payment.ConfirmedByUserId,
                InvoicePaidAmount = invoice.PaidAmount,
                InvoiceRemainingAmount = remaining,
                InvoicePaymentStatus = invoice.PaymentStatus
            };
        }
    }
}
