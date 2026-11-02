using OZE.XRaySimulator.Application;
using OZE.XRaySimulator.Infrastructure;

namespace OZE.XRaySimulator.Infrastructure;

public sealed class StartupInitializer : IHostedService
{
    private readonly ISampleImageProvider _sampleImageProvider;
    private readonly IDeviceManager _deviceManager;
    private readonly ILogger<StartupInitializer> _logger;

    public StartupInitializer(
        ISampleImageProvider sampleImageProvider,
        IDeviceManager deviceManager,
        ILogger<StartupInitializer> logger)
    {
        _sampleImageProvider = sampleImageProvider;
        _deviceManager = deviceManager;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Initializing X-ray Simulation Service components...");
        await _sampleImageProvider.InitializeAsync(cancellationToken);
        await _deviceManager.InitializeDevicesAsync(cancellationToken);
        _logger.LogInformation("X-ray Simulation Service initialization complete.");
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
