using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    public class AuditLogQueryService : IAuditLogQueryService
    {
        private const int DefaultPageSize = 20;
        private const int MaxPageSize = 100;

        private readonly IAuditLogRepository _auditLogRepository;

        public AuditLogQueryService(IAuditLogRepository auditLogRepository)
        {
            _auditLogRepository = auditLogRepository;
        }

        public async Task<AuditLogListResponse> GetPagedAsync(AuditLogQueryParameters query, CancellationToken cancellationToken = default)
        {
            ConditionGuard.ThrowIf(query.FromDate.HasValue && query.ToDate.HasValue && query.FromDate > query.ToDate,
                ErrorConstants.AuditLogMessage.InvalidDateRange);

            var page = Math.Max(1, query.Page);
            var pageSize = query.PageSize < 1 ? DefaultPageSize : Math.Min(query.PageSize, MaxPageSize);

            // Clinic days to moments: from the start of FromDate up to (not including) the start of the day after ToDate
            DateTimeOffset? from = query.FromDate.HasValue ? StartOfClinicDay(query.FromDate.Value) : null;
            DateTimeOffset? to = query.ToDate.HasValue ? StartOfClinicDay(query.ToDate.Value.AddDays(1)) : null;

            IReadOnlyCollection<string>? keywordUserIds = null;
            if (!string.IsNullOrWhiteSpace(query.Keyword))
            {
                keywordUserIds = await _auditLogRepository.FindUserIdsByNameAsync(query.Keyword.Trim(), cancellationToken);
            }

            var (logs, total) = await _auditLogRepository.GetPageAsync(query, from, to, keywordUserIds, page, pageSize, cancellationToken);
            var actors = await GetActorsAsync(logs, cancellationToken);

            return new AuditLogListResponse
            {
                Items = logs.Select(x => Fill(new AuditLogResponse(), x, actors)).ToList(),
                Page = page,
                PageSize = pageSize,
                TotalItems = total,
                TotalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize))
            };
        }

        public async Task<AuditLogDetailResponse> GetByIdAsync(long id, CancellationToken cancellationToken = default)
        {
            var log = await _auditLogRepository.GetByIdAsync(id, cancellationToken);
            ConditionGuard.Ensure<NotFoundException>(log != null, ErrorConstants.AuditLogMessage.NotFound);

            var actors = await GetActorsAsync(new[] { log! }, cancellationToken);
            var detail = Fill(new AuditLogDetailResponse(), log!, actors);
            detail.OldValues = log!.OldValues;
            detail.NewValues = log.NewValues;
            detail.AdditionalData = log.AdditionalData;
            return detail;
        }

        private async Task<Dictionary<string, AuditActor>> GetActorsAsync(IEnumerable<AuditLog> logs, CancellationToken cancellationToken)
        {
            var userIds = logs.Where(x => x.UserId != null).Select(x => x.UserId!).Distinct().ToList();
            var actors = await _auditLogRepository.GetActorsAsync(userIds, cancellationToken);
            return actors.ToDictionary(x => x.UserId);
        }

        private static T Fill<T>(T response, AuditLog log, Dictionary<string, AuditActor> actors) where T : AuditLogResponse
        {
            var actor = log.UserId != null && actors.TryGetValue(log.UserId, out var found) ? found : null;
            response.Id = log.Id;
            response.UserId = log.UserId;
            response.UserName = actor?.Name;
            response.UserRole = actor?.Role;
            response.Action = log.Action;
            response.EntityType = log.EntityType;
            response.EntityId = log.EntityId;
            response.IpAddress = log.IpAddress;
            response.UserAgent = log.UserAgent;
            response.CreatedAt = log.CreatedAt;
            return response;
        }

        // The clinic has no daylight saving, so its day starts at a fixed offset from UTC
        private static DateTimeOffset StartOfClinicDay(DateOnly date) =>
            new(date.ToDateTime(TimeOnly.MinValue), TimeSpan.FromHours(ClinicTimeConstants.UtcOffsetHours));
    }
}
