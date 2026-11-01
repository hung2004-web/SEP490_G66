using Microsoft.Extensions.Options;
using OZE.XRaySimulator.Domain.Entities;
using OZE.XRaySimulator.Domain.Enums;
using OZE.XRaySimulator.Domain.Models;
using OZE.XRaySimulator.Infrastructure;
using OZE.XRaySimulator.Infrastructure.Options;

namespace OZE.XRaySimulator.Application;

public sealed record CreateCaptureCommand(
    string CaptureRequestId,
    string OrderReference,
    string DeviceId,
    ImagingModality Modality,
    string? BodyRegion,
    int ImageCount,
    ExposureSettings Exposure
);

public sealed record CreateCaptureResult(
    bool Success,
    int StatusCode,
    string? ErrorMessage,
    CaptureSession? Session,
    int EstimatedDurationSeconds
);

public interface ICaptureService
{
    Task<CreateCaptureResult> CreateCaptureSessionAsync(CreateCaptureCommand command, CancellationToken cancellationToken = default);
    bool TryGetSession(string simulationId, out CaptureSession? session);
    IReadOnlyList<CaptureSession> GetAllSessions();
    bool TryCancelSession(string simulationId, out string? errorMessage);
}

public sealed class CaptureService : ICaptureService
{
    private readonly ISessionStore _sessionStore;
    private readonly IDeviceManager _deviceManager;
    private readonly ICaptureJobQueue _jobQueue;
    private readonly IOptions<SimulatorOptions> _options;
    private readonly ILogger<CaptureService> _logger;

    public CaptureService(
        ISessionStore sessionStore,
        IDeviceManager deviceManager,
        ICaptureJobQueue jobQueue,
        IOptions<SimulatorOptions> options,
        ILogger<CaptureService> logger)
    {
        _sessionStore = sessionStore;
        _deviceManager = deviceManager;
        _jobQueue = jobQueue;
        _options = options;
        _logger = logger;
    }

    public async Task<CreateCaptureResult> CreateCaptureSessionAsync(CreateCaptureCommand command, CancellationToken cancellationToken = default)
    {
        // 1. Idempotency check: if captureRequestId was already submitted, return the existing session
        if (_sessionStore.TryGetByCaptureRequestId(command.CaptureRequestId, out var existingSession) && existingSession != null)
        {
            _logger.LogInformation("Idempotent request detected for CaptureRequestId {RequestId}. Returning existing session {SimulationId}.", command.CaptureRequestId, existingSession.SimulationId);
            return new CreateCaptureResult(
                Success: true,
                StatusCode: StatusCodes.Status202Accepted,
                ErrorMessage: null,
                Session: existingSession,
                EstimatedDurationSeconds: _options.Value.CaptureSeconds + _options.Value.ProcessingSeconds
            );
        }

        // 2. Validate device existence
        if (!_deviceManager.TryGetDevice(command.DeviceId, out var device) || device == null)
        {
            return new CreateCaptureResult(
                Success: false,
                StatusCode: StatusCodes.Status404NotFound,
                ErrorMessage: $"Device '{command.DeviceId}' does not exist.",
                Session: null,
                EstimatedDurationSeconds: 0
            );
        }

        // 3. Validate device availability & state
        if (device.State == DeviceState.BUSY)
        {
            return new CreateCaptureResult(
                Success: false,
                StatusCode: StatusCodes.Status409Conflict,
                ErrorMessage: $"Device '{command.DeviceId}' is currently BUSY with another session.",
                Session: null,
                EstimatedDurationSeconds: 0
            );
        }

        if (device.State is DeviceState.OFFLINE or DeviceState.ERROR)
        {
            return new CreateCaptureResult(
                Success: false,
                StatusCode: StatusCodes.Status503ServiceUnavailable,
                ErrorMessage: $"Device '{command.DeviceId}' is {device.State} ({device.LastError ?? "unavailable"}).",
                Session: null,
                EstimatedDurationSeconds: 0
            );
        }

        // 4. Validate modality support
        if (!device.SupportedModalities.Contains(command.Modality))
        {
            return new CreateCaptureResult(
                Success: false,
                StatusCode: StatusCodes.Status400BadRequest,
                ErrorMessage: $"Device '{command.DeviceId}' does not support modality '{command.Modality}'. Supported: [{string.Join(", ", device.SupportedModalities)}].",
                Session: null,
                EstimatedDurationSeconds: 0
            );
        }

        // 5. Generate SimulationId
        var simulationId = $"SIM-{Guid.NewGuid():N}"[..18].ToUpperInvariant();

        // 6. Attempt device reservation
        if (!_deviceManager.TryReserveDevice(command.DeviceId, simulationId, out _, out var reserveError))
        {
            return new CreateCaptureResult(
                Success: false,
                StatusCode: StatusCodes.Status409Conflict,
                ErrorMessage: reserveError ?? "Could not reserve device.",
                Session: null,
                EstimatedDurationSeconds: 0
            );
        }

        // 7. Create Session
        var session = new CaptureSession(
            simulationId: simulationId,
            captureRequestId: command.CaptureRequestId,
            orderReference: command.OrderReference,
            deviceId: command.DeviceId,
            modality: command.Modality,
            bodyRegion: command.BodyRegion,
            imageCount: command.ImageCount,
            exposure: command.Exposure
        );

        _sessionStore.GetOrAdd(session);

        // 8. Queue execution
        await _jobQueue.EnqueueAsync(new CaptureJob(simulationId), cancellationToken);

        int estimatedDuration = _options.Value.CaptureSeconds + _options.Value.ProcessingSeconds;
        _logger.LogInformation("Created simulation session {SimulationId} for order {OrderRef} on device {DeviceId}.", simulationId, command.OrderReference, command.DeviceId);

        return new CreateCaptureResult(
            Success: true,
            StatusCode: StatusCodes.Status202Accepted,
            ErrorMessage: null,
            Session: session,
            EstimatedDurationSeconds: estimatedDuration
        );
    }

    public bool TryGetSession(string simulationId, out CaptureSession? session)
    {
        return _sessionStore.TryGetBySimulationId(simulationId, out session);
    }

    public IReadOnlyList<CaptureSession> GetAllSessions()
    {
        return _sessionStore.GetAll();
    }

    public bool TryCancelSession(string simulationId, out string? errorMessage)
    {
        if (!_sessionStore.TryGetBySimulationId(simulationId, out var session) || session == null)
        {
            errorMessage = $"Session '{simulationId}' not found.";
            return false;
        }

        if (session.State is CaptureState.COMPLETED or CaptureState.CANCELLED or CaptureState.FAILED)
        {
            errorMessage = $"Session '{simulationId}' has already reached final state '{session.State}'.";
            return false;
        }

        bool cancelled = _jobQueue.TryCancelSession(simulationId);
        if (!cancelled)
        {
            // Transition directly if still in ACCEPTED
            session.TransitionTo(CaptureState.CANCELLED);
            _deviceManager.ReleaseDevice(session.DeviceId, session.SimulationId);
        }

        errorMessage = null;
        return true;
    }
}
