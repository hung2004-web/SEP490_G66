using System.Collections.Concurrent;
using Microsoft.Extensions.Options;
using OZE.XRaySimulator.Domain.Entities;
using OZE.XRaySimulator.Domain.Enums;
using OZE.XRaySimulator.Infrastructure.Options;

namespace OZE.XRaySimulator.Application;

public interface IDeviceManager
{
    Task InitializeDevicesAsync(CancellationToken cancellationToken = default);
    IReadOnlyList<Device> GetAllDevices();
    bool TryGetDevice(string id, out Device? device);
    bool TryReserveDevice(string deviceId, string simulationId, out Device? device, out string? errorMessage);
    void ReleaseDevice(string deviceId, string simulationId);
    void SetDeviceState(string deviceId, DeviceState state, string? reason = null);
}

public sealed class DeviceManager : IDeviceManager
{
    private readonly ConcurrentDictionary<string, Device> _devices = new();
    private readonly IConfiguration _configuration;
    private readonly ILogger<DeviceManager> _logger;

    public DeviceManager(IConfiguration configuration, ILogger<DeviceManager> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task InitializeDevicesAsync(CancellationToken cancellationToken = default)
    {
        var deviceConfigs = _configuration.GetSection("Devices").Get<List<DeviceConfig>>() ?? new List<DeviceConfig>();

        if (deviceConfigs.Count == 0)
        {
            // Default virtual devices if not specified in appsettings
            deviceConfigs.Add(new DeviceConfig
            {
                Id = "XR-PANO-01",
                Name = "Virtual Panoramic X-Ray Unit 1",
                SerialNumber = "VXR-PANO-9081",
                Modalities = new List<string> { "PANORAMIC" }
            });
            deviceConfigs.Add(new DeviceConfig
            {
                Id = "XR-IO-01",
                Name = "Virtual Intraoral Digital Sensor 1",
                SerialNumber = "VXR-IO-4122",
                Modalities = new List<string> { "PERIAPICAL", "BITEWING" }
            });
        }

        foreach (var cfg in deviceConfigs)
        {
            var modalities = cfg.Modalities
                .Select(m => Enum.TryParse<ImagingModality>(m, true, out var mod) ? mod : (ImagingModality?)null)
                .Where(m => m.HasValue)
                .Select(m => m!.Value)
                .ToList();

            var device = new Device(cfg.Id, cfg.Name, cfg.SerialNumber, modalities);
            // Simulate power-on sequence: OFFLINE -> INITIALIZING -> READY
            device.TransitionTo(DeviceState.INITIALIZING);
            _devices[cfg.Id] = device;
        }

        // Simulate short warm-up delay before READY
        await Task.Delay(500, cancellationToken);
        foreach (var device in _devices.Values)
        {
            if (device.State == DeviceState.INITIALIZING)
            {
                device.TransitionTo(DeviceState.READY);
                _logger.LogInformation("Virtual Device '{DeviceId}' ({Name}) is now READY.", device.Id, device.Name);
            }
        }
    }

    public IReadOnlyList<Device> GetAllDevices()
    {
        return _devices.Values.ToList().AsReadOnly();
    }

    public bool TryGetDevice(string id, out Device? device)
    {
        return _devices.TryGetValue(id, out device);
    }

    public bool TryReserveDevice(string deviceId, string simulationId, out Device? device, out string? errorMessage)
    {
        if (!_devices.TryGetValue(deviceId, out device))
        {
            errorMessage = $"Device '{deviceId}' does not exist.";
            return false;
        }

        return device.TryReserve(simulationId, out errorMessage);
    }

    public void ReleaseDevice(string deviceId, string simulationId)
    {
        if (_devices.TryGetValue(deviceId, out var device))
        {
            device.Release(simulationId);
        }
    }

    public void SetDeviceState(string deviceId, DeviceState state, string? reason = null)
    {
        if (_devices.TryGetValue(deviceId, out var device))
        {
            device.TransitionTo(state, reason);
            _logger.LogInformation("Device '{DeviceId}' state explicitly set to '{State}'.", deviceId, state);
        }
    }
}
