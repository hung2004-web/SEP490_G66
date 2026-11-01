using System.Collections.Concurrent;
using Microsoft.Extensions.Options;
using OZE.XRaySimulator.Domain.Entities;
using OZE.XRaySimulator.Infrastructure.Options;

namespace OZE.XRaySimulator.Infrastructure;

public interface ISessionStore
{
    CaptureSession GetOrAdd(CaptureSession session);
    bool TryGetBySimulationId(string simulationId, out CaptureSession? session);
    bool TryGetByCaptureRequestId(string captureRequestId, out CaptureSession? session);
    IReadOnlyList<CaptureSession> GetAll();
    void CleanupExpiredSessions();
}

public sealed class SessionStore : ISessionStore
{
    private readonly ConcurrentDictionary<string, CaptureSession> _sessionsBySimId = new();
    private readonly ConcurrentDictionary<string, string> _simIdByRequestId = new();
    private readonly IOptions<SimulatorOptions> _options;
    private readonly ILogger<SessionStore> _logger;

    public SessionStore(IOptions<SimulatorOptions> options, ILogger<SessionStore> logger)
    {
        _options = options;
        _logger = logger;
    }

    public CaptureSession GetOrAdd(CaptureSession session)
    {
        // First check idempotency key
        if (_simIdByRequestId.TryGetValue(session.CaptureRequestId, out var existingSimId))
        {
            if (_sessionsBySimId.TryGetValue(existingSimId, out var existingSession))
            {
                return existingSession;
            }
        }

        // Add session
        var added = _sessionsBySimId.GetOrAdd(session.SimulationId, session);
        _simIdByRequestId.TryAdd(session.CaptureRequestId, added.SimulationId);
        return added;
    }

    public bool TryGetBySimulationId(string simulationId, out CaptureSession? session)
    {
        return _sessionsBySimId.TryGetValue(simulationId, out session);
    }

    public bool TryGetByCaptureRequestId(string captureRequestId, out CaptureSession? session)
    {
        session = null;
        if (_simIdByRequestId.TryGetValue(captureRequestId, out var simId))
        {
            return _sessionsBySimId.TryGetValue(simId, out session);
        }
        return false;
    }

    public IReadOnlyList<CaptureSession> GetAll()
    {
        return _sessionsBySimId.Values.ToList().AsReadOnly();
    }

    public void CleanupExpiredSessions()
    {
        var cutoff = DateTimeOffset.UtcNow.AddMinutes(-Math.Max(5, _options.Value.SessionTtlMinutes));
        var expiredSimIds = _sessionsBySimId
            .Where(kvp => kvp.Value.UpdatedAt < cutoff)
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var id in expiredSimIds)
        {
            if (_sessionsBySimId.TryRemove(id, out var removed))
            {
                _simIdByRequestId.TryRemove(removed.CaptureRequestId, out _);
                _logger.LogInformation("Evicted expired simulation session {SimulationId}", id);
            }
        }
    }
}
