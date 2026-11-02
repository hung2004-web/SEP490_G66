using OZE.XRaySimulator.Domain.Enums;
using OZE.XRaySimulator.Domain.Exceptions;

namespace OZE.XRaySimulator.Domain.Entities;

public sealed class Device
{
    private readonly object _syncLock = new();

    public string Id { get; init; }
    public string Name { get; init; }
    public string Model { get; init; } = "Virtual-Dental-XRay-v1";
    public string SerialNumber { get; init; }
    public IReadOnlyList<ImagingModality> SupportedModalities { get; init; }
    public DeviceState State { get; private set; } = DeviceState.OFFLINE;
    public string? CurrentSimulationId { get; private set; }
    public string? LastError { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; } = DateTimeOffset.UtcNow;

    public Device(string id, string name, string serialNumber, IEnumerable<ImagingModality> supportedModalities)
    {
        Id = id;
        Name = name;
        SerialNumber = serialNumber;
        SupportedModalities = supportedModalities.ToList().AsReadOnly();
    }

    public void TransitionTo(DeviceState targetState, string? reason = null)
    {
        lock (_syncLock)
        {
            if (State == targetState) return;

            bool isValid = (State, targetState) switch
            {
                (DeviceState.OFFLINE, DeviceState.INITIALIZING) => true,
                (DeviceState.INITIALIZING, DeviceState.READY) => true,
                (DeviceState.INITIALIZING, DeviceState.ERROR) => true,
                (DeviceState.INITIALIZING, DeviceState.OFFLINE) => true,
                (DeviceState.READY, DeviceState.BUSY) => true,
                (DeviceState.READY, DeviceState.ERROR) => true,
                (DeviceState.READY, DeviceState.OFFLINE) => true,
                (DeviceState.BUSY, DeviceState.READY) => true,
                (DeviceState.BUSY, DeviceState.ERROR) => true,
                (DeviceState.BUSY, DeviceState.OFFLINE) => true,
                (DeviceState.ERROR, DeviceState.INITIALIZING) => true,
                (DeviceState.ERROR, DeviceState.OFFLINE) => true,
                _ => false
            };

            if (!isValid)
            {
                throw new InvalidStateTransitionException(
                    $"Device '{Id}' cannot transition from '{State}' to '{targetState}'.");
            }

            State = targetState;
            LastError = targetState == DeviceState.ERROR ? reason ?? "Device internal error." : null;
            if (targetState != DeviceState.BUSY)
            {
                CurrentSimulationId = null;
            }
            UpdatedAt = DateTimeOffset.UtcNow;
        }
    }

    public bool TryReserve(string simulationId, out string? errorMessage)
    {
        lock (_syncLock)
        {
            if (State != DeviceState.READY)
            {
                errorMessage = $"Device '{Id}' is not READY (current state: {State}).";
                return false;
            }

            State = DeviceState.BUSY;
            CurrentSimulationId = simulationId;
            UpdatedAt = DateTimeOffset.UtcNow;
            errorMessage = null;
            return true;
        }
    }

    public void Release(string simulationId)
    {
        lock (_syncLock)
        {
            if (CurrentSimulationId == simulationId || State == DeviceState.BUSY)
            {
                CurrentSimulationId = null;
                State = DeviceState.READY;
                UpdatedAt = DateTimeOffset.UtcNow;
            }
        }
    }
}
