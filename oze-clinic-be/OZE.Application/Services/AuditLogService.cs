using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using OZE.Application.Interfaces;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    public class AuditLogService : IAuditLogService
    {
        // Must match the UserAgent column length in AuditLogConfiguration
        private const int MaxUserAgentLength = 500;

        private readonly IAuditLogRepository _auditLogRepository;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<AuditLogService> _logger;

        public AuditLogService(
            IAuditLogRepository auditLogRepository,
            IHttpContextAccessor httpContextAccessor,
            ILogger<AuditLogService> logger)
        {
            _auditLogRepository = auditLogRepository;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        // A failed log must not undo the action that was already saved, so errors are only logged
        public async Task LogAsync(string action, string entityType, string entityId,
            object? oldValues = null, object? newValues = null, string? additionalData = null)
        {
            try
            {
                var http = _httpContextAccessor.HttpContext;
                var userAgent = http?.Request.Headers.UserAgent.ToString();

                await _auditLogRepository.AddAsync(new AuditLog
                {
                    UserId = http?.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? http?.User.FindFirstValue("sub"),
                    Action = action,
                    EntityType = entityType,
                    EntityId = entityId,
                    OldValues = oldValues == null ? null : JsonSerializer.Serialize(oldValues),
                    NewValues = newValues == null ? null : JsonSerializer.Serialize(newValues),
                    IpAddress = http?.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = string.IsNullOrEmpty(userAgent) ? null : userAgent[..Math.Min(userAgent.Length, MaxUserAgentLength)],
                    AdditionalData = additionalData,
                    CreatedAt = DateTimeOffset.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not write the audit log {Action} for {EntityType} {EntityId}", action, entityType, entityId);
            }
        }
    }
}
