using OZE.XRaySimulator.Domain.Entities;
using OZE.XRaySimulator.Domain.Enums;

namespace OZE.XRaySimulator.Domain.Interfaces;

public interface IXRayDevice
{
    string DeviceId { get; }
    DeviceState CurrentState { get; }
    Task<Device> GetStatusAsync(CancellationToken cancellationToken = default);
    Task TransitionStateAsync(DeviceState targetState, string? reason = null, CancellationToken cancellationToken = default);
}
