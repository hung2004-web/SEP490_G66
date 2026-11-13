using Microsoft.Extensions.Logging;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    // F-CRM: the receptionist records each call about a follow-up visit; "Declined" closes the follow-up (no more reminders)
    public class FollowUpCareService : IFollowUpCareService
    {
        private readonly ICareRepository _careRepository;
        private readonly IAuditLogService _auditLogService;

        public FollowUpCareService(ICareRepository careRepository, IAuditLogService auditLogService)
        {
            _careRepository = careRepository;
            _auditLogService = auditLogService;
        }

        public async Task<FollowUpContactResponse> RecordContactAsync(
            long examinationId,
            string userId,
            RecordFollowUpContactRequest request,
            CancellationToken cancellationToken = default)
        {
            var exam = await _careRepository.GetExaminationForContactAsync(examinationId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(exam != null, ErrorConstants.CareMessage.ExaminationNotFound);
            ConditionGuard.Ensure(exam!.FollowUpDate != null || exam.FollowUpAppointmentId != null, ErrorConstants.CareMessage.NoFollowUp);

            var outcome = CareConstants.Outcomes.FirstOrDefault(x => string.Equals(x, request.Outcome?.Trim(), StringComparison.OrdinalIgnoreCase));
            ConditionGuard.Ensure(outcome != null, ErrorConstants.CareMessage.OutcomeInvalid);

            var today = DateOnly.FromDateTime(ClinicClock.Today);
            if (outcome == CareConstants.OutcomeCallBack)
            {
                ConditionGuard.Ensure(request.CallBackDate.HasValue && request.CallBackDate.Value >= today, ErrorConstants.CareMessage.CallBackDateRequired);
            }

            var contact = new FollowUpContact
            {
                ExaminationId = exam.Id,
                Outcome = outcome!,
                Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
                CallBackDate = outcome == CareConstants.OutcomeCallBack ? request.CallBackDate : null,
                CreatedByUserId = userId,
                CreatedAt = DateTimeOffset.UtcNow
            };
            exam.FollowUpContacts.Add(contact);
            // Declined stops the reminders; any other outcome keeps (or reopens) the follow-up
            exam.FollowUpClosed = outcome == CareConstants.OutcomeDeclined;
            exam.UpdatedAt = contact.CreatedAt;
            await _careRepository.SaveChangesAsync(cancellationToken);

            await _auditLogService.LogAsync(AuditConstants.FollowUpContactRecorded, AuditConstants.ExaminationEntity, exam.Id.ToString(),
                newValues: new { contact.Outcome, contact.Note, contact.CallBackDate });

            var names = await _careRepository.GetStaffNamesAsync(new[] { userId }, cancellationToken);
            return ToResponse(contact, names);
        }

        public async Task<List<FollowUpContactResponse>> GetContactsAsync(long examinationId, CancellationToken cancellationToken = default)
        {
            var contacts = await _careRepository.GetContactsAsync(examinationId, cancellationToken);
            var names = await _careRepository.GetStaffNamesAsync(contacts.Select(x => x.CreatedByUserId), cancellationToken);
            return contacts.Select(x => ToResponse(x, names)).ToList();
        }

        private static FollowUpContactResponse ToResponse(FollowUpContact x, IReadOnlyDictionary<string, string> names) => new()
        {
            Id = x.Id,
            Outcome = x.Outcome,
            Note = x.Note,
            CallBackDate = x.CallBackDate,
            CreatedByName = names.GetValueOrDefault(x.CreatedByUserId),
            CreatedAt = x.CreatedAt
        };
    }

    // Patient debts and payment reminders (SMS and email). Overdue installments are only reminded, never fined (BR-PAY-08).
    public class DebtService : IDebtService
    {
        private readonly ICareRepository _careRepository;
        private readonly IAuditLogService _auditLogService;
        private readonly ISmsSender? _smsSender;
        private readonly IEmailSender? _emailSender;
        private readonly ILogger<DebtService>? _logger;

        public DebtService(
            ICareRepository careRepository,
            IAuditLogService auditLogService,
            ISmsSender? smsSender = null,
            IEmailSender? emailSender = null,
            ILogger<DebtService>? logger = null)
        {
            _careRepository = careRepository;
            _auditLogService = auditLogService;
            _smsSender = smsSender;
            _emailSender = emailSender;
            _logger = logger;
        }

        public async Task<DebtListResponse> GetDebtsAsync(DebtQuery query, CancellationToken cancellationToken = default)
        {
            var invoices = await _careRepository.GetOpenInvoicesAsync(query.SearchKeyword, cancellationToken);
            var stats = await _careRepository.GetReminderStatsAsync(invoices.Select(x => x.Id), cancellationToken);
            var today = DateOnly.FromDateTime(ClinicClock.Today);

            var all = invoices.Select(x => ToDebt(x, stats, today)).ToList();
            var shown = (query.OverdueOnly ? all.Where(x => x.OverdueCount > 0) : all)
                // Overdue first, then the oldest debt
                .OrderByDescending(x => x.OverdueCount > 0)
                .ThenBy(x => x.CreatedAt)
                .ToList();

            return new DebtListResponse
            {
                Items = shown.Skip((query.PageNumber - 1) * query.PageSize).Take(query.PageSize).ToList(),
                TotalCount = shown.Count,
                PageNumber = query.PageNumber,
                PageSize = query.PageSize,
                TotalRemaining = all.Sum(x => x.RemainingAmount),
                OverdueInvoiceCount = all.Count(x => x.OverdueCount > 0)
            };
        }

        public async Task<PaymentReminderResponse> RemindAsync(long invoiceId, string userId, RemindPaymentRequest request, CancellationToken cancellationToken = default)
        {
            var invoice = await _careRepository.GetInvoiceWithPatientAsync(invoiceId, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(invoice != null, ErrorConstants.CareMessage.InvoiceNotFound);
            var today = DateOnly.FromDateTime(ClinicClock.Today);
            var debt = ToDebt(invoice!, new Dictionary<long, (int, DateTimeOffset)>(), today);
            ConditionGuard.Ensure(debt.RemainingAmount > 0, ErrorConstants.CareMessage.NothingOwed);
            ConditionGuard.Ensure(HasContact(invoice!.Patient), ErrorConstants.CareMessage.NoContact);

            var stats = await _careRepository.GetReminderStatsAsync(new[] { invoiceId }, cancellationToken);
            if (!request.Force && stats.TryGetValue(invoiceId, out var last))
            {
                ConditionGuard.ThrowIf(last.Last > DateTimeOffset.UtcNow.AddHours(-CareConstants.PaymentReminderCooldownHours), ErrorConstants.CareMessage.RemindedRecently);
            }

            var period = NextOpenPeriod(invoice, today);
            var message = BuildMessage(invoice, debt, period, today);
            var reminder = await SendAndRecordAsync(invoice, period?.Id, message, isAutomatic: false, userId, cancellationToken);
            await _careRepository.SaveChangesAsync(cancellationToken);

            await _auditLogService.LogAsync(AuditConstants.PaymentReminded, AuditConstants.InvoiceEntity, invoiceId.ToString(),
                newValues: new { reminder.Channels, reminder.InstallmentPeriodId });

            var names = await _careRepository.GetStaffNamesAsync(new[] { userId }, cancellationToken);
            return ToResponse(reminder, names);
        }

        // Every payment recorded, newest first: who took or confirmed it, with totals over all matching payments
        public async Task<PaymentHistoryResponse> GetPaymentHistoryAsync(PaymentHistoryQuery query, CancellationToken cancellationToken = default)
        {
            var (items, total, cash, transfer, pending) = await _careRepository.GetPaymentHistoryAsync(query, cancellationToken);
            var names = await _careRepository.GetStaffNamesAsync(items.Select(x => x.ConfirmedByUserId), cancellationToken);
            foreach (var item in items)
            {
                item.ConfirmedByName = item.ConfirmedByUserId == null ? null : names.GetValueOrDefault(item.ConfirmedByUserId);
            }

            return new PaymentHistoryResponse
            {
                Items = items,
                TotalCount = total,
                PageNumber = query.PageNumber,
                PageSize = query.PageSize,
                ConfirmedCash = cash,
                ConfirmedTransfer = transfer,
                PendingAmount = pending
            };
        }

        public async Task<List<PaymentReminderResponse>> GetRemindersAsync(long invoiceId, CancellationToken cancellationToken = default)
        {
            var reminders = await _careRepository.GetRemindersAsync(invoiceId, cancellationToken);
            var names = await _careRepository.GetStaffNamesAsync(reminders.Select(x => x.SentByUserId), cancellationToken);
            return reminders.Select(x => ToResponse(x, names)).ToList();
        }

        // Daily job: installments due on targetDate, and overdue ones not reminded in the last OverdueReminderEveryDays days
        public async Task<BatchPaymentReminderResponse> RemindDueInstallmentsAsync(DateOnly targetDate, CancellationToken cancellationToken = default)
        {
            var today = DateOnly.FromDateTime(ClinicClock.Today);
            var periods = await _careRepository.GetPeriodsToRemindAsync(targetDate, today, cancellationToken);
            var lastByPeriod = await _careRepository.GetLastReminderByPeriodAsync(periods.Select(x => x.Id), cancellationToken);
            var overdueCutoff = DateTimeOffset.UtcNow.AddDays(-CareConstants.OverdueReminderEveryDays);

            var due = periods
                .Where(p => p.DueDate == targetDate
                    ? !lastByPeriod.ContainsKey(p.Id)
                    : !lastByPeriod.TryGetValue(p.Id, out var last) || last < overdueCutoff)
                .GroupBy(p => p.InstallmentPlan.InvoiceId)
                .Select(g => g.OrderBy(p => p.DueDate).First())
                .ToList();

            var response = new BatchPaymentReminderResponse { TotalTargeted = due.Count };
            foreach (var period in due)
            {
                var invoice = period.InstallmentPlan.Invoice;
                if (!HasContact(invoice.Patient))
                {
                    response.FailedCount++;
                    continue;
                }

                try
                {
                    var debt = ToDebt(invoice, new Dictionary<long, (int, DateTimeOffset)>(), today);
                    await SendAndRecordAsync(invoice, period.Id, BuildMessage(invoice, debt, period, today), isAutomatic: true, CareConstants.SystemUser, cancellationToken);
                    response.RemindedCount++;
                }
                catch (Exception ex)
                {
                    _logger?.LogError(ex, "Payment reminder failed for invoice {InvoiceId}", invoice.Id);
                    response.FailedCount++;
                }
            }

            await _careRepository.SaveChangesAsync(cancellationToken);
            return response;
        }

        private async Task<PaymentReminder> SendAndRecordAsync(
            Invoice invoice,
            long? periodId,
            string message,
            bool isAutomatic,
            string userId,
            CancellationToken cancellationToken)
        {
            var channels = new List<string>();
            if (_smsSender != null && !string.IsNullOrWhiteSpace(invoice.Patient.PhoneNumber))
            {
                try
                {
                    await _smsSender.SendSmsAsync(invoice.Patient.PhoneNumber, message);
                    channels.Add(CareConstants.ChannelSms);
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "Payment reminder SMS failed for invoice {InvoiceId}", invoice.Id);
                }
            }

            if (_emailSender != null && !string.IsNullOrWhiteSpace(invoice.Patient.Email))
            {
                try
                {
                    await _emailSender.SendEmailAsync(invoice.Patient.Email, "Nha khoa OZE - Nhắc thanh toán", message);
                    channels.Add(CareConstants.ChannelEmail);
                }
                catch (Exception ex)
                {
                    // An email failure must not lose the SMS that already went out
                    _logger?.LogWarning(ex, "Payment reminder email failed for invoice {InvoiceId}", invoice.Id);
                }
            }

            // Nothing reached the patient: do not record it as reminded
            ConditionGuard.ThrowIf(channels.Count == 0, ErrorConstants.CareMessage.SendFailed);

            var reminder = new PaymentReminder
            {
                InvoiceId = invoice.Id,
                InstallmentPeriodId = periodId,
                Channels = string.Join(",", channels),
                Message = message.Length <= 1000 ? message : message[..1000],
                IsAutomatic = isAutomatic,
                SentByUserId = isAutomatic ? null : userId,
                SentAt = DateTimeOffset.UtcNow
            };
            await _careRepository.AddReminderAsync(reminder, cancellationToken);
            return reminder;
        }

        private static bool HasContact(Patient? patient) =>
            !string.IsNullOrWhiteSpace(patient?.PhoneNumber) || !string.IsNullOrWhiteSpace(patient?.Email);

        private static InstallmentPeriod? NextOpenPeriod(Invoice invoice, DateOnly today) =>
            invoice.InstallmentPlans
                .SelectMany(x => x.Periods)
                .Where(x => x.Status != InstallmentConstants.PeriodPaid)
                .OrderBy(x => x.DueDate)
                .FirstOrDefault();

        private static string Money(decimal value) => $"{value:N0}".Replace(",", ".") + "đ";

        private static string BuildMessage(Invoice invoice, DebtItemResponse debt, InstallmentPeriod? period, DateOnly today)
        {
            var text = $"Nha khoa OZE: hóa đơn {invoice.InvoiceNumber} của {invoice.Patient.FullName} còn {Money(debt.RemainingAmount)} chưa thanh toán.";
            if (period != null)
            {
                text += period.DueDate < today
                    ? $" Kỳ góp {period.Sequence} ({Money(period.Amount)}) đã quá hạn từ {period.DueDate:dd/MM/yyyy}."
                    : $" Kỳ góp {period.Sequence} ({Money(period.Amount)}) đến hạn ngày {period.DueDate:dd/MM/yyyy}.";
            }

            return text + " Quý khách vui lòng thanh toán tại quầy hoặc chuyển khoản. Xin cảm ơn.";
        }

        private static DebtItemResponse ToDebt(Invoice x, IReadOnlyDictionary<long, (int Count, DateTimeOffset Last)> stats, DateOnly today)
        {
            var periods = x.InstallmentPlans.SelectMany(p => p.Periods).Where(p => p.Status != InstallmentConstants.PeriodPaid).OrderBy(p => p.DueDate).ToList();
            var overdue = periods.Where(p => p.DueDate < today).ToList();
            var next = periods.FirstOrDefault(p => p.DueDate >= today);
            stats.TryGetValue(x.Id, out var stat);
            return new DebtItemResponse
            {
                InvoiceId = x.Id,
                InvoiceNumber = x.InvoiceNumber,
                PatientId = x.PatientId,
                PatientCode = x.Patient?.PatientCode ?? string.Empty,
                PatientName = x.Patient?.FullName ?? string.Empty,
                PatientPhoneNumber = x.Patient?.PhoneNumber,
                CreatedAt = x.CreatedAt,
                AgeDays = Math.Max(0, today.DayNumber - DateOnly.FromDateTime(ClinicClock.ToClinicTime(x.CreatedAt)).DayNumber),
                FinalAmount = x.FinalAmount,
                PaidAmount = x.PaidAmount,
                RemainingAmount = Math.Max(0, x.FinalAmount - x.PaidAmount),
                PaymentStatus = x.PaymentStatus,
                HasInstallmentPlan = x.InstallmentPlans.Count > 0,
                NextDueDate = next?.DueDate,
                NextDueAmount = next?.Amount,
                OverdueCount = overdue.Count,
                OverdueAmount = overdue.Sum(p => p.Amount),
                LastRemindedAt = stat.Count > 0 ? stat.Last : null,
                ReminderCount = stat.Count
            };
        }

        private static PaymentReminderResponse ToResponse(PaymentReminder x, IReadOnlyDictionary<string, string> names) => new()
        {
            Id = x.Id,
            InvoiceId = x.InvoiceId,
            InstallmentPeriodId = x.InstallmentPeriodId,
            Channels = x.Channels,
            Message = x.Message,
            IsAutomatic = x.IsAutomatic,
            SentByName = x.IsAutomatic ? "Hệ thống" : x.SentByUserId == null ? null : names.GetValueOrDefault(x.SentByUserId),
            SentAt = x.SentAt
        };
    }

    // End-of-day reconciliation for the manager: every drawer of the day, money by method, transfers still waiting,
    // refunds paid. Confirming closes the day with a fixed snapshot.
    public class ReconciliationService : IReconciliationService
    {
        private readonly ICareRepository _careRepository;
        private readonly IAuditLogService _auditLogService;

        public ReconciliationService(ICareRepository careRepository, IAuditLogService auditLogService)
        {
            _careRepository = careRepository;
            _auditLogService = auditLogService;
        }

        public async Task<DailyReconciliationResponse> GetDailyAsync(DateOnly? date, CancellationToken cancellationToken = default)
        {
            var day = date ?? DateOnly.FromDateTime(ClinicClock.Today);
            var (from, to) = DayWindow(day);

            var sessions = await _careRepository.GetSessionsOpenedBetweenAsync(from, to, cancellationToken);
            var payments = await _careRepository.GetConfirmedPaymentsBetweenAsync(from, to, cancellationToken);
            var pending = await _careRepository.GetPendingTransfersBeforeAsync(to, cancellationToken);
            var refunds = await _careRepository.GetRefundsProcessedBetweenAsync(from, to, cancellationToken);
            var saved = await _careRepository.GetReconciliationAsync(day, cancellationToken);
            var names = await _careRepository.GetStaffNamesAsync(
                sessions.SelectMany(x => new[] { x.OpenedByUserId, x.HandoverToUserId }).Append(saved?.ConfirmedByUserId),
                cancellationToken);

            var closed = sessions.Where(x => x.Status == CashSessionConstants.Closed).ToList();
            var cashCollected = Round(payments.Where(x => x.PaymentMethod == PaymentConstants.Cash).Sum(x => x.Amount));
            var cashInSessions = Round(closed.Sum(x => x.CashCollected ?? 0));

            return new DailyReconciliationResponse
            {
                ClinicDate = day,
                IsConfirmed = saved != null,
                ConfirmedAt = saved?.ConfirmedAt,
                ConfirmedByName = saved == null ? null : names.GetValueOrDefault(saved.ConfirmedByUserId),
                Notes = saved?.Notes,
                Sessions = sessions.Select(x => new ReconciliationSessionItem
                {
                    Id = x.Id,
                    OpenedByName = names.GetValueOrDefault(x.OpenedByUserId, string.Empty),
                    OpenedAt = x.OpenedAt,
                    ClosedAt = x.ClosedAt,
                    Status = x.Status,
                    OpeningCash = x.OpeningCash,
                    CashCollected = x.CashCollected,
                    ExpenseTotal = x.ExpenseTotal,
                    ExpectedCash = x.ExpectedCash,
                    CountedCash = x.CountedCash,
                    Difference = x.Difference,
                    HandoverToName = x.HandoverToUserId == null ? null : names.GetValueOrDefault(x.HandoverToUserId)
                }).ToList(),
                OpenSessionCount = sessions.Count - closed.Count,
                CashCollected = cashCollected,
                // An open drawer has no frozen total yet, so "outside the drawers" is only known once all are closed
                CashOutsideSessions = closed.Count == sessions.Count ? Math.Max(0, cashCollected - cashInSessions) : 0,
                CashExpected = Round(closed.Sum(x => x.ExpectedCash ?? 0)),
                CashCounted = Round(closed.Sum(x => x.CountedCash ?? 0)),
                CashDifference = Round(closed.Sum(x => x.Difference ?? 0)),
                TransferConfirmed = Round(payments.Where(x => x.PaymentMethod != PaymentConstants.Cash).Sum(x => x.Amount)),
                PendingTransfers = pending,
                PendingTransferAmount = Round(pending.Sum(x => x.Amount)),
                Refunds = refunds,
                RefundTotal = Round(refunds.Sum(x => x.Amount))
            };
        }

        public async Task<DailyReconciliationResponse> ConfirmAsync(DateOnly date, string userId, ConfirmReconciliationRequest request, CancellationToken cancellationToken = default)
        {
            ConditionGuard.Ensure(date <= DateOnly.FromDateTime(ClinicClock.Today), ErrorConstants.CareMessage.ReconciliationFutureDate);
            var current = await GetDailyAsync(date, cancellationToken);
            ConditionGuard.ThrowIf(current.IsConfirmed, ErrorConstants.CareMessage.ReconciliationDone);
            ConditionGuard.ThrowIf(current.OpenSessionCount > 0, ErrorConstants.CareMessage.ReconciliationOpenSessions);

            var notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
            var needsNote = current.CashDifference != 0 || current.CashOutsideSessions > 0 || current.PendingTransfers.Count > 0;
            ConditionGuard.ThrowIf(needsNote && notes == null, ErrorConstants.CareMessage.ReconciliationNoteRequired);

            var reconciliation = new DailyReconciliation
            {
                ClinicDate = date,
                SessionCount = current.Sessions.Count,
                CashCollected = current.CashCollected,
                CashExpected = current.CashExpected,
                CashCounted = current.CashCounted,
                CashDifference = current.CashDifference,
                TransferConfirmed = current.TransferConfirmed,
                PendingTransferCount = current.PendingTransfers.Count,
                PendingTransferAmount = current.PendingTransferAmount,
                RefundTotal = current.RefundTotal,
                Notes = notes,
                ConfirmedByUserId = userId,
                ConfirmedAt = DateTimeOffset.UtcNow
            };
            await _careRepository.AddReconciliationAsync(reconciliation, cancellationToken);
            await _careRepository.SaveChangesAsync(cancellationToken);

            await _auditLogService.LogAsync(AuditConstants.DailyReconciled, AuditConstants.ReconciliationEntity, date.ToString("yyyy-MM-dd"),
                newValues: new { reconciliation.CashCollected, reconciliation.CashDifference, reconciliation.PendingTransferCount, reconciliation.RefundTotal });

            return await GetDailyAsync(date, cancellationToken);
        }

        private static (DateTimeOffset From, DateTimeOffset To) DayWindow(DateOnly date)
        {
            var start = new DateTimeOffset(date.ToDateTime(TimeOnly.MinValue), TimeSpan.FromHours(ClinicTimeConstants.UtcOffsetHours));
            return (start, start.AddDays(1));
        }

        private static decimal Round(decimal value) => decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    }
}
