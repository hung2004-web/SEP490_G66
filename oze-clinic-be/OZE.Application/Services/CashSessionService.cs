using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    // A receptionist's cash drawer: open with the starting cash, record cash paid out, count and hand over at the end
    public class CashSessionService : ICashSessionService
    {
        private readonly ICashSessionRepository _cashSessionRepository;
        private readonly IAuditLogService _auditLogService;
        private readonly INotificationService? _notifications;

        public CashSessionService(ICashSessionRepository cashSessionRepository, IAuditLogService auditLogService, INotificationService? notifications = null)
        {
            _cashSessionRepository = cashSessionRepository;
            _auditLogService = auditLogService;
            _notifications = notifications;
        }

        public async Task<CashSessionResponse?> GetCurrentAsync(string userId, CancellationToken cancellationToken = default)
        {
            var session = await _cashSessionRepository.GetOpenByUserAsync(userId, cancellationToken);
            return session == null ? null : await ToResponseAsync(session, cancellationToken);
        }

        public async Task<CashSessionResponse> OpenAsync(
            string userId,
            OpenCashSessionRequest request,
            CancellationToken cancellationToken = default)
        {
            var openingCash = Round(request.OpeningCash ?? 0m);
            ConditionGuard.Ensure(openingCash >= 0, ErrorConstants.CashSessionMessage.OpeningCashInvalid);

            var existing = await _cashSessionRepository.GetOpenByUserAsync(userId, cancellationToken);
            ConditionGuard.ThrowIf(existing != null, ErrorConstants.CashSessionMessage.AlreadyOpen);

            var now = DateTimeOffset.UtcNow;
            var session = new CashSession
            {
                OpenedByUserId = userId,
                OpenedAt = now,
                OpeningCash = openingCash,
                Status = CashSessionConstants.Open,
                Notes = Trimmed(request.Notes),
                CreatedAt = now
            };
            await _cashSessionRepository.AddAsync(session, cancellationToken);
            await _cashSessionRepository.SaveChangesAsync(cancellationToken);

            await _auditLogService.LogAsync(AuditConstants.CashSessionOpened, AuditConstants.CashSessionEntity, session.Id.ToString(),
                newValues: new { session.OpeningCash });

            return await ToResponseAsync(session, cancellationToken);
        }

        public async Task<CashSessionResponse> AddExpenseAsync(
            string userId,
            AddCashExpenseRequest request,
            CancellationToken cancellationToken = default)
        {
            var session = await LoadOpenAsync(userId, cancellationToken);

            var amount = Round(request.Amount ?? 0m);
            ConditionGuard.Ensure(amount > 0, ErrorConstants.CashSessionMessage.ExpenseAmountInvalid);
            var description = request.Description?.Trim() ?? string.Empty;
            ConditionGuard.Ensure(description.Length > 0, ErrorConstants.CashSessionMessage.ExpenseDescriptionRequired);
            var category = NormalizeCategory(request.Category);

            // Money cannot leave a drawer that does not have it
            var current = await ToResponseAsync(session, cancellationToken);
            ConditionGuard.ThrowIf(amount > current.ExpectedCash, ErrorConstants.CashSessionMessage.ExpenseExceedsCash);

            var expense = new CashExpense
            {
                Amount = amount,
                Category = category,
                Description = description,
                CreatedByUserId = userId,
                CreatedAt = DateTimeOffset.UtcNow
            };
            session.Expenses.Add(expense);
            session.UpdatedAt = expense.CreatedAt;
            await _cashSessionRepository.SaveChangesAsync(cancellationToken);

            await _auditLogService.LogAsync(AuditConstants.CashExpenseAdded, AuditConstants.CashSessionEntity, session.Id.ToString(),
                newValues: new { expense.Id, expense.Amount, expense.Category, expense.Description });

            return await ToResponseAsync(session, cancellationToken);
        }

        public async Task<CashSessionResponse> RemoveExpenseAsync(string userId, long expenseId, CancellationToken cancellationToken = default)
        {
            var session = await LoadOpenAsync(userId, cancellationToken);
            var expense = session.Expenses.FirstOrDefault(x => x.Id == expenseId);
            ConditionGuard.Ensure<NotFoundException>(expense != null, ErrorConstants.CashSessionMessage.ExpenseNotFound);

            session.Expenses.Remove(expense!);
            _cashSessionRepository.RemoveExpense(expense!);
            session.UpdatedAt = DateTimeOffset.UtcNow;
            await _cashSessionRepository.SaveChangesAsync(cancellationToken);

            await _auditLogService.LogAsync(AuditConstants.CashExpenseRemoved, AuditConstants.CashSessionEntity, session.Id.ToString(),
                oldValues: new { expense!.Id, expense.Amount, expense.Description });

            return await ToResponseAsync(session, cancellationToken);
        }

        public async Task<CashSessionResponse> CloseAsync(
            string userId,
            CloseCashSessionRequest request,
            CancellationToken cancellationToken = default)
        {
            var session = await LoadOpenAsync(userId, cancellationToken);

            var counted = Round(request.CountedCash ?? -1m);
            ConditionGuard.Ensure(counted >= 0, ErrorConstants.CashSessionMessage.CountedCashInvalid);

            string? handoverTo = null;
            if (!string.IsNullOrWhiteSpace(request.HandoverToUserId))
            {
                handoverTo = request.HandoverToUserId.Trim();
                var candidates = await _cashSessionRepository.GetActiveReceptionistsAsync(cancellationToken);
                ConditionGuard.Ensure(
                    handoverTo != userId && candidates.Any(x => x.UserId == handoverTo),
                    ErrorConstants.CashSessionMessage.HandoverInvalid);
            }

            var now = DateTimeOffset.UtcNow;
            var numbers = await ComputeAsync(session, now, cancellationToken);
            var difference = counted - numbers.ExpectedCash;
            var notes = Trimmed(request.Notes);
            ConditionGuard.ThrowIf(difference != 0 && notes == null, ErrorConstants.CashSessionMessage.DifferenceNoteRequired);

            // Numbers are frozen at hand-over so later voids or edits do not rewrite a closed drawer
            session.Status = CashSessionConstants.Closed;
            session.ClosedAt = now;
            session.CashCollected = numbers.CashCollected;
            session.TransferConfirmed = numbers.TransferConfirmed;
            session.ExpenseTotal = numbers.ExpenseTotal;
            session.ExpectedCash = numbers.ExpectedCash;
            session.CountedCash = counted;
            session.Difference = difference;
            session.HandoverToUserId = handoverTo;
            session.Notes = notes ?? session.Notes;
            session.UpdatedAt = now;
            await _cashSessionRepository.SaveChangesAsync(cancellationToken);

            await _auditLogService.LogAsync(AuditConstants.CashSessionClosed, AuditConstants.CashSessionEntity, session.Id.ToString(),
                newValues: new { session.ExpectedCash, session.CountedCash, session.Difference, session.HandoverToUserId });

            var response = await ToResponseAsync(session, cancellationToken);
            await NotifyAsync(n => n.NotifyUsersAsync(new[] { handoverTo },
                new NotificationContent(NotificationConstants.Text.CashHandoverTitle, string.Format(NotificationConstants.Text.CashHandoverMessage, response.OpenedByName, NotificationFormat.Money(counted)),
                    NotificationConstants.Reference.CashSession, session.Id.ToString()), cancellationToken));
            if (difference != 0)
            {
                // A drawer that does not match the books is for the manager to look at
                await NotifyAsync(n => n.NotifyRolesAsync(new[] { RoleConstants.ClinicManagerRole },
                    new NotificationContent(NotificationConstants.Text.CashDifferenceTitle,
                        string.Format(NotificationConstants.Text.CashDifferenceMessage, response.OpenedByName, (difference > 0 ? "+" : "-") + NotificationFormat.Money(Math.Abs(difference)), notes),
                        NotificationConstants.Reference.CashSession, session.Id.ToString()), cancellationToken: cancellationToken));
            }

            return response;
        }


        // In-app notifications are optional so unit tests can build the service without them
        private Task NotifyAsync(Func<INotificationService, Task> send) => _notifications == null ? Task.CompletedTask : send(_notifications);

        public async Task<List<StaffOption>> GetHandoverCandidatesAsync(string userId, CancellationToken cancellationToken = default)
        {
            var receptionists = await _cashSessionRepository.GetActiveReceptionistsAsync(cancellationToken);
            return receptionists.Where(x => x.UserId != userId).ToList();
        }

        public async Task<CashSessionResponse> GetByIdAsync(string userId, bool isManager, long id, CancellationToken cancellationToken = default)
        {
            var session = await _cashSessionRepository.GetByIdAsync(id, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(session != null, ErrorConstants.CashSessionMessage.NotFound);
            ConditionGuard.Ensure<ForbiddenException>(isManager || session!.OpenedByUserId == userId, ErrorConstants.CashSessionMessage.NotOwner);
            return await ToResponseAsync(session!, cancellationToken);
        }

        public async Task<PagedResult<CashSessionSummaryResponse>> GetPagedAsync(
            string userId,
            bool isManager,
            CashSessionQuery query,
            CancellationToken cancellationToken = default)
        {
            var openedBy = isManager ? query.OpenedByUserId : userId;
            var page = await _cashSessionRepository.GetPagedAsync(query, openedBy, cancellationToken);
            var names = await _cashSessionRepository.GetStaffNamesAsync(
                page.Items.SelectMany(x => new[] { x.OpenedByUserId, x.HandoverToUserId ?? string.Empty }),
                cancellationToken);

            return new PagedResult<CashSessionSummaryResponse>
            {
                Items = page.Items.Select(x => new CashSessionSummaryResponse
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
                TotalCount = page.TotalCount,
                PageNumber = page.PageNumber,
                PageSize = page.PageSize
            };
        }

        private async Task<CashSession> LoadOpenAsync(string userId, CancellationToken cancellationToken)
        {
            var session = await _cashSessionRepository.GetOpenByUserAsync(userId, cancellationToken);
            ConditionGuard.Ensure(session != null, ErrorConstants.CashSessionMessage.NoOpenSession);
            return session!;
        }

        private sealed record Numbers(
            decimal CashCollected,
            decimal TransferConfirmed,
            decimal ExpenseTotal,
            decimal ExpectedCash,
            List<CashSessionPaymentItem> Payments);

        // Cash in the drawer = opening cash + cash payments this receptionist took - cash paid out
        private async Task<Numbers> ComputeAsync(CashSession session, DateTimeOffset until, CancellationToken cancellationToken)
        {
            var payments = await _cashSessionRepository.GetPaymentsConfirmedByAsync(
                session.OpenedByUserId, session.OpenedAt, until, cancellationToken);
            var cash = Round(payments.Where(x => x.PaymentMethod == PaymentConstants.Cash).Sum(x => x.Amount));
            var transfer = Round(payments.Where(x => x.PaymentMethod != PaymentConstants.Cash).Sum(x => x.Amount));
            var expenses = Round(session.Expenses.Sum(x => x.Amount));
            return new Numbers(cash, transfer, expenses, session.OpeningCash + cash - expenses, payments);
        }

        private async Task<CashSessionResponse> ToResponseAsync(CashSession session, CancellationToken cancellationToken)
        {
            var isClosed = session.Status == CashSessionConstants.Closed;
            var numbers = await ComputeAsync(session, session.ClosedAt ?? DateTimeOffset.UtcNow.AddSeconds(1), cancellationToken);
            var names = await _cashSessionRepository.GetStaffNamesAsync(
                new[] { session.OpenedByUserId, session.HandoverToUserId ?? string.Empty }, cancellationToken);

            return new CashSessionResponse
            {
                Id = session.Id,
                OpenedByUserId = session.OpenedByUserId,
                OpenedByName = names.GetValueOrDefault(session.OpenedByUserId, string.Empty),
                OpenedAt = session.OpenedAt,
                Status = session.Status,
                OpeningCash = session.OpeningCash,
                CashCollected = isClosed ? session.CashCollected ?? 0 : numbers.CashCollected,
                TransferConfirmed = isClosed ? session.TransferConfirmed ?? 0 : numbers.TransferConfirmed,
                ExpenseTotal = isClosed ? session.ExpenseTotal ?? 0 : numbers.ExpenseTotal,
                ExpectedCash = isClosed ? session.ExpectedCash ?? 0 : numbers.ExpectedCash,
                CountedCash = session.CountedCash,
                Difference = session.Difference,
                ClosedAt = session.ClosedAt,
                HandoverToUserId = session.HandoverToUserId,
                HandoverToName = session.HandoverToUserId == null ? null : names.GetValueOrDefault(session.HandoverToUserId),
                Notes = session.Notes,
                Expenses = session.Expenses
                    .OrderBy(x => x.CreatedAt)
                    .Select(x => new CashExpenseResponse
                    {
                        Id = x.Id,
                        Amount = x.Amount,
                        Category = x.Category,
                        Description = x.Description,
                        CreatedAt = x.CreatedAt
                    }).ToList(),
                Payments = numbers.Payments
            };
        }

        private static string NormalizeCategory(string? category)
        {
            if (string.IsNullOrWhiteSpace(category))
            {
                return CashSessionConstants.ExpenseOther;
            }

            var match = CashSessionConstants.ExpenseCategories
                .FirstOrDefault(x => string.Equals(x, category.Trim(), StringComparison.OrdinalIgnoreCase));
            ConditionGuard.Ensure(match != null, ErrorConstants.CashSessionMessage.ExpenseCategoryInvalid);
            return match!;
        }

        private static string? Trimmed(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        private static decimal Round(decimal value) => decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    }
}
