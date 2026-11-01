using OZE.XRaySimulator.Domain.Entities;
using OZE.XRaySimulator.Domain.Enums;
using OZE.XRaySimulator.Domain.Interfaces;

namespace OZE.XRaySimulator.Domain.Services;

public sealed class SimulatedXRayDevice : IXRayDevice
{
    private readonly Device _device;

    public string DeviceId => _device.Id;
    public DeviceState CurrentState => _device.State;
    public Device InnerDevice => _device;

    public SimulatedXRayDevice(Device device)
    {
        _device = device;
    }

    public Task<Device> GetStatusAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(_device);
    }

    public Task TransitionStateAsync(DeviceState targetState, string? reason = null, CancellationToken cancellationToken = default)
    {
        _device.TransitionTo(targetState, reason);
        return Task.CompletedTask;
    }
}
