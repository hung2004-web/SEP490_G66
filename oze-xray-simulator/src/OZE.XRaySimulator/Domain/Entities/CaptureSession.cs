using OZE.XRaySimulator.Domain.Enums;
using OZE.XRaySimulator.Domain.Exceptions;
using OZE.XRaySimulator.Domain.Models;

namespace OZE.XRaySimulator.Domain.Entities;

public sealed class CaptureSession
{
    private readonly object _syncLock = new();
    private readonly List<CaptureImage> _images = new();

    public string SimulationId { get; init; }
    public string CaptureRequestId { get; init; }
    public string OrderReference { get; init; }
    public string DeviceId { get; init; }
    public ImagingModality Modality { get; init; }
    public string? BodyRegion { get; init; }
    public int ImageCount { get; init; } = 1;
    public ExposureSettings Exposure { get; init; } = new();
    public CaptureState State { get; private set; } = CaptureState.ACCEPTED;
    public int Progress { get; private set; } = 0;
    public string? FailureCode { get; private set; }
    public string? FailureMessage { get; private set; }
    public IReadOnlyList<CaptureImage> Images
    {
        get
        {
            lock (_syncLock) return _images.ToList().AsReadOnly();
        }
    }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; private set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CompletedAt { get; private set; }

    public CaptureSession(
        string simulationId,
        string captureRequestId,
        string orderReference,
        string deviceId,
        ImagingModality modality,
        string? bodyRegion,
        int imageCount,
        ExposureSettings exposure)
    {
        SimulationId = simulationId;
        CaptureRequestId = captureRequestId;
        OrderReference = orderReference;
        DeviceId = deviceId;
        Modality = modality;
        BodyRegion = bodyRegion;
        ImageCount = Math.Max(1, imageCount);
        Exposure = exposure;
    }

    public void SetProgress(int progress)
    {
        lock (_syncLock)
        {
            Progress = Math.Clamp(progress, 0, 100);
            UpdatedAt = DateTimeOffset.UtcNow;
        }
    }

    public void TransitionTo(CaptureState targetState, string? failureCode = null, string? failureMessage = null)
    {
        lock (_syncLock)
        {
            if (State == targetState) return;

            bool isValid = (State, targetState) switch
            {
                (CaptureState.ACCEPTED, CaptureState.CAPTURING) => true,
                (CaptureState.ACCEPTED, CaptureState.CANCELLED) => true,
                (CaptureState.ACCEPTED, CaptureState.FAILED) => true,

                (CaptureState.CAPTURING, CaptureState.PROCESSING) => true,
                (CaptureState.CAPTURING, CaptureState.CANCELLED) => true,
                (CaptureState.CAPTURING, CaptureState.FAILED) => true,

                (CaptureState.PROCESSING, CaptureState.COMPLETED) => true,
                (CaptureState.PROCESSING, CaptureState.FAILED) => true,

                _ => false
            };

            if (!isValid)
            {
                throw new InvalidStateTransitionException(
                    $"Capture session '{SimulationId}' cannot transition from '{State}' to '{targetState}'.");
            }

            State = targetState;
            UpdatedAt = DateTimeOffset.UtcNow;

            if (targetState == CaptureState.FAILED)
            {
                FailureCode = failureCode ?? "UNKNOWN_ERROR";
                FailureMessage = failureMessage ?? "Simulation capture failed.";
                CompletedAt = DateTimeOffset.UtcNow;
            }
            else if (targetState is CaptureState.COMPLETED or CaptureState.CANCELLED)
            {
                if (targetState == CaptureState.COMPLETED)
                {
                    Progress = 100;
                }
                CompletedAt = DateTimeOffset.UtcNow;
            }
        }
    }

    public void AddImage(CaptureImage image)
    {
        lock (_syncLock)
        {
            _images.Add(image);
            UpdatedAt = DateTimeOffset.UtcNow;
        }
    }
}
