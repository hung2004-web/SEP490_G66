using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    public class InstallmentService : IInstallmentService
    {
        private readonly IInstallmentRepository _installmentRepository;
        private readonly IInvoiceRepository _invoiceRepository;
        private readonly IPatientRepository _patientRepository;
        private readonly IAuditLogService _auditLogService;

        public InstallmentService(
            IInstallmentRepository installmentRepository,
            IInvoiceRepository invoiceRepository,
            IPatientRepository patientRepository,
            IAuditLogService auditLogService)
        {
            _installmentRepository = installmentRepository;
            _invoiceRepository = invoiceRepository;
            _patientRepository = patientRepository;
            _auditLogService = auditLogService;
        }

        public async Task<InstallmentPlanResponse> CreatePlanAsync(
            long invoiceId,
            string createdByUserId,
            CreateInstallmentPlanRequest request,
            CancellationToken cancellationToken = default)
        {
            var invoice = await _invoiceRepository.GetByIdWithDetailsAsync(invoiceId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(invoice != null, ErrorConstants.InstallmentMessage.InvoiceNotFound);
            ConditionGuard.ThrowIf(
                invoice!.PaymentStatus == InvoiceConstants.Cancelled
                || invoice.PaymentStatus == InvoiceConstants.Refunded
                || invoice.PaymentStatus == InvoiceConstants.PartiallyRefunded,
                ErrorConstants.PaymentMessage.InvoiceNotPayable);
            ConditionGuard.ThrowIf(
                await _installmentRepository.HasPlanForInvoiceAsync(invoiceId, cancellationToken),
                ErrorConstants.InstallmentMessage.PlanAlreadyExists);

            var periodRequests = request.Periods ?? new List<CreateInstallmentPeriodRequest>();
            ConditionGuard.Ensure(periodRequests.Count > 0, ErrorConstants.InstallmentMessage.PeriodsRequired);

            var sequences = periodRequests.Select(p => p.Sequence).ToList();
            ConditionGuard.Ensure(
                sequences.Distinct().Count() == sequences.Count,
                ErrorConstants.InstallmentMessage.PeriodSequenceInvalid);

            var clinicToday = DateOnly.FromDateTime(ClinicClock.Today);
            var periods = new List<InstallmentPeriod>();
            decimal periodsSum = 0m;

            foreach (var item in periodRequests.OrderBy(p => p.Sequence))
            {
                ConditionGuard.Ensure(item.Sequence > 0, ErrorConstants.InstallmentMessage.PeriodSequenceInvalid);
                var amount = decimal.Round(item.Amount, 2, MidpointRounding.AwayFromZero);
                ConditionGuard.Ensure(amount > 0, ErrorConstants.InstallmentMessage.PeriodAmountInvalid);
                ConditionGuard.Ensure(item.DueDate >= clinicToday, ErrorConstants.InstallmentMessage.PeriodDueDateInvalid);

                periodsSum += amount;
                periods.Add(new InstallmentPeriod
                {
                    Sequence = item.Sequence,
                    Amount = amount,
                    DueDate = item.DueDate,
                    Status = InstallmentConstants.PeriodPending
                });
            }

            periodsSum = decimal.Round(periodsSum, 2, MidpointRounding.AwayFromZero);
            var remaining = GetRemainingBalance(invoice);
            // Open-P2: sum(periods) ≤ remaining at plan create
            ConditionGuard.Ensure(periodsSum <= remaining, ErrorConstants.InstallmentMessage.PeriodsExceedRemaining);

            var plan = new InstallmentPlan
            {
                InvoiceId = invoice.Id,
                Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
                CreatedAt = DateTimeOffset.UtcNow,
                CreatedByUserId = string.IsNullOrWhiteSpace(createdByUserId) ? null : createdByUserId,
                Periods = periods
            };

            await _installmentRepository.AddPlanAsync(plan, cancellationToken);
            await _installmentRepository.SaveChangesAsync(cancellationToken);

            await SafeAuditAsync(
                AuditConstants.InstallmentPlanCreated,
                plan.Id.ToString(),
                null,
                new { plan.InvoiceId, PeriodCount = periods.Count, periodsSum, createdByUserId });

            plan.Invoice = invoice;
            foreach (var period in plan.Periods)
            {
                period.InstallmentPlan = plan;
            }

            return ToPlanResponse(plan);
        }

        public async Task<InstallmentPlanResponse> GetPlanByInvoiceAsync(
            long invoiceId,
            string? ownerUserId,
            CancellationToken cancellationToken = default)
        {
            var plan = await _installmentRepository.GetPlanByInvoiceIdAsync(invoiceId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(plan != null, ErrorConstants.InstallmentMessage.PlanNotFound);
            await EnsureOwnedByAsync(plan!.Invoice, ownerUserId, cancellationToken);

            if (MarkOverdueOnRead(plan))
            {
                await _installmentRepository.SaveChangesAsync(cancellationToken);
            }

            return ToPlanResponse(plan);
        }

        public async Task<IReadOnlyList<InstallmentPeriodResponse>> GetDuePeriodsAsync(
            CancellationToken cancellationToken = default)
        {
            var clinicToday = DateOnly.FromDateTime(ClinicClock.Today);
            await _installmentRepository.MarkPendingPastDueAsOverdueAsync(clinicToday, cancellationToken);
            var due = await _installmentRepository.GetDuePeriodsAsync(clinicToday, cancellationToken);
            return due.Select(ToPeriodResponse).ToList();
        }

        private static bool MarkOverdueOnRead(InstallmentPlan plan)
        {
            var clinicToday = DateOnly.FromDateTime(ClinicClock.Today);
            var changed = false;
            foreach (var period in plan.Periods)
            {
                if (period.Status == InstallmentConstants.PeriodPending && period.DueDate < clinicToday)
                {
                    period.Status = InstallmentConstants.PeriodOverdue;
                    changed = true;
                }
            }

            return changed;
        }

        private static decimal GetRemainingBalance(Invoice invoice) => InvoiceMoneyHelper.GetRemaining(invoice);

        private async Task EnsureOwnedByAsync(Invoice invoice, string? ownerUserId, CancellationToken cancellationToken)
        {
            if (ownerUserId is null)
            {
                return;
            }

            var patient = await _patientRepository.GetByUserIdAsync(ownerUserId);
            ConditionGuard.Ensure<ForbiddenException>(
                patient != null && patient.Id == invoice.PatientId,
                ErrorConstants.InvoiceMessage.AccessDenied);
        }

        private async Task SafeAuditAsync(string action, string entityId, object? oldValues, object? newValues)
        {
            try
            {
                await _auditLogService.LogAsync(action, AuditConstants.InstallmentPlanEntity, entityId, oldValues, newValues);
            }
            catch
            {
                // Audit must never fail the business operation.
            }
        }

        private static InstallmentPlanResponse ToPlanResponse(InstallmentPlan plan)
        {
            var periods = plan.Periods.OrderBy(p => p.Sequence).Select(ToPeriodResponse).ToList();
            return new InstallmentPlanResponse
            {
                Id = plan.Id,
                InvoiceId = plan.InvoiceId,
                Notes = plan.Notes,
                CreatedAt = plan.CreatedAt,
                CreatedByUserId = plan.CreatedByUserId,
                PeriodsTotalAmount = decimal.Round(periods.Sum(p => p.Amount), 2, MidpointRounding.AwayFromZero),
                Periods = periods
            };
        }

        private static InstallmentPeriodResponse ToPeriodResponse(InstallmentPeriod period)
        {
            var invoice = period.InstallmentPlan?.Invoice;
            return new InstallmentPeriodResponse
            {
                Id = period.Id,
                InstallmentPlanId = period.InstallmentPlanId,
                InvoiceId = period.InstallmentPlan?.InvoiceId ?? invoice?.Id ?? 0,
                Sequence = period.Sequence,
                Amount = period.Amount,
                DueDate = period.DueDate,
                Status = period.Status,
                PaidAt = period.PaidAt,
                PaymentId = period.PaymentId,
                InvoiceNumber = invoice?.InvoiceNumber,
                PatientId = invoice?.PatientId,
                PatientName = invoice?.Patient?.FullName
            };
        }
    }
}
