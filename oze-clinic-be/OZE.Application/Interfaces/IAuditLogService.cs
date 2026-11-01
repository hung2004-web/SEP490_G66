namespace OZE.Application.Interfaces
{
    public interface IAuditLogService
    {
        // The signed-in user, IP address and browser are read from the current request, so callers do not pass them.
        // oldValues and newValues are written as JSON; pass only the fields that matter
        Task LogAsync(string action, string entityType, string entityId,
            object? oldValues = null, object? newValues = null, string? additionalData = null);
    }
}
