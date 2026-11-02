using System.Collections.Concurrent;
using System.Threading.Channels;
using Microsoft.Extensions.Options;
using OZE.XRaySimulator.Domain.Entities;
using OZE.XRaySimulator.Domain.Enums;
using OZE.XRaySimulator.Infrastructure;
using OZE.XRaySimulator.Infrastructure.Options;

namespace OZE.XRaySimulator.Application;

public sealed record CaptureJob(string SimulationId);

public interface ICaptureJobQueue
{
    ValueTask EnqueueAsync(CaptureJob job, CancellationToken cancellationToken = default);
    bool TryCancelSession(string simulationId);
}

public sealed class CaptureOrchestrator : BackgroundService, ICaptureJobQueue
{
    private readonly Channel<CaptureJob> _channel = Channel.CreateUnbounded<CaptureJob>(new UnboundedChannelOptions
    {
        SingleReader = true
    });
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _runningSessionCts = new();

    private readonly IServiceProvider _serviceProvider;
    private readonly IOptions<SimulatorOptions> _options;
    private readonly ILogger<CaptureOrchestrator> _logger;

    public CaptureOrchestrator(
        IServiceProvider serviceProvider,
        IOptions<SimulatorOptions> options,
        ILogger<CaptureOrchestrator> logger)
    {
        _serviceProvider = serviceProvider;
        _options = options;
        _logger = logger;
    }

    public async ValueTask EnqueueAsync(CaptureJob job, CancellationToken cancellationToken = default)
    {
        await _channel.Writer.WriteAsync(job, cancellationToken);
    }

    public bool TryCancelSession(string simulationId)
    {
        if (_runningSessionCts.TryGetValue(simulationId, out var cts))
        {
            cts.Cancel();
            return true;
        }
        return false;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("CaptureOrchestrator background worker started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var job = await _channel.Reader.ReadAsync(stoppingToken);
                await ProcessJobAsync(job, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in CaptureOrchestrator loop.");
            }
        }

        _logger.LogInformation("CaptureOrchestrator background worker stopped.");
    }

    private async Task ProcessJobAsync(CaptureJob job, CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var sessionStore = scope.ServiceProvider.GetRequiredService<ISessionStore>();
        var deviceManager = scope.ServiceProvider.GetRequiredService<IDeviceManager>();
        var acquisitionService = scope.ServiceProvider.GetRequiredService<IAcquisitionService>();
        var webhookClient = scope.ServiceProvider.GetRequiredService<IWebhookClient>();
        var faultInjector = scope.ServiceProvider.GetRequiredService<IFaultInjector>();

        if (!sessionStore.TryGetBySimulationId(job.SimulationId, out var session) || session == null)
        {
            _logger.LogWarning("Session {SimulationId} not found in store for processing.", job.SimulationId);
            return;
        }

        if (!deviceManager.TryGetDevice(session.DeviceId, out var device) || device == null)
        {
            _logger.LogError("Device {DeviceId} not found for session {SimulationId}.", session.DeviceId, session.SimulationId);
            session.TransitionTo(CaptureState.FAILED, "DEVICE_NOT_FOUND", "Assigned device not found.");
            return;
        }

        using var sessionCts = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
        _runningSessionCts[session.SimulationId] = sessionCts;

        int sequence = 1;
        try
        {
            var token = sessionCts.Token;

            // Check if fault injector injected capture failure before starting
            if (faultInjector.TryConsumeNextCaptureFailure(out var failCode, out var failMsg))
            {
                session.TransitionTo(CaptureState.FAILED, failCode, failMsg);
                deviceManager.ReleaseDevice(device.Id, session.SimulationId);

                DispatchWebhook(webhookClient, faultInjector, "CAPTURE_FAILED", sequence++, session, _logger, failCode, failMsg);
                return;
            }

            // Step 1: Transition to CAPTURING
            session.TransitionTo(CaptureState.CAPTURING);
            session.SetProgress(10);
            DispatchWebhook(webhookClient, faultInjector, "CAPTURE_PROGRESS", sequence++, session, _logger);

            // Simulate capture duration
            var captureDuration = TimeSpan.FromSeconds(Math.Max(1, _options.Value.CaptureSeconds));
            var captureSteps = 3;
            var stepDelay = TimeSpan.FromMilliseconds(captureDuration.TotalMilliseconds / captureSteps);

            for (int i = 1; i <= captureSteps; i++)
            {
                await Task.Delay(stepDelay, token);
                session.SetProgress(10 + (i * 15)); // 25%, 40%, 55%
                DispatchWebhook(webhookClient, faultInjector, "CAPTURE_PROGRESS", sequence++, session, _logger);
            }

            // Step 2: Transition to PROCESSING
            session.TransitionTo(CaptureState.PROCESSING);
            session.SetProgress(70);
            DispatchWebhook(webhookClient, faultInjector, "CAPTURE_PROGRESS", sequence++, session, _logger);

            var procDuration = TimeSpan.FromSeconds(Math.Max(1, _options.Value.ProcessingSeconds));
            await Task.Delay(procDuration, token);
            session.SetProgress(90);

            // Step 3: Image acquisition & metadata generation
            var imageSummaries = await acquisitionService.AcquireImagesForSessionAsync(session, device, token);

            // Step 4: Complete session
            session.TransitionTo(CaptureState.COMPLETED);
            deviceManager.ReleaseDevice(device.Id, session.SimulationId);

            DispatchWebhook(webhookClient, faultInjector, "CAPTURE_COMPLETED", sequence++, session, _logger, images: imageSummaries);

            _logger.LogInformation("Capture session {SimulationId} successfully completed.", session.SimulationId);
        }
        catch (OperationCanceledException) when (sessionCts.IsCancellationRequested && !stoppingToken.IsCancellationRequested)
        {
            _logger.LogInformation("Capture session {SimulationId} was cancelled.", session.SimulationId);
            session.TransitionTo(CaptureState.CANCELLED);
            deviceManager.ReleaseDevice(device.Id, session.SimulationId);

            DispatchWebhook(webhookClient, faultInjector, "CAPTURE_CANCELLED", sequence++, session, _logger);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Capture session {SimulationId} encountered an unexpected error.", session.SimulationId);
            session.TransitionTo(CaptureState.FAILED, "SIMULATION_PROCESSING_ERROR", ex.Message);
            deviceManager.ReleaseDevice(device.Id, session.SimulationId);

            DispatchWebhook(webhookClient, faultInjector, "CAPTURE_FAILED", sequence++, session, _logger, "SIMULATION_PROCESSING_ERROR", ex.Message);
        }
        finally
        {
            _runningSessionCts.TryRemove(session.SimulationId, out _);
        }
    }

    private static void DispatchWebhook(
        IWebhookClient client,
        IFaultInjector faultInjector,
        string eventType,
        int sequence,
        CaptureSession session,
        ILogger logger,
        string? failureCode = null,
        string? failureMessage = null,
        IReadOnlyList<WebhookImageSummary>? images = null)
    {
        var config = faultInjector.CurrentConfig;
        if (config.DropWebhooks)
        {
            return;
        }

        _ = Task.Run(async () =>
        {
            try
            {
                if (config.WebhookDelayMilliseconds > 0)
                {
                    await Task.Delay(config.WebhookDelayMilliseconds);
                }

                await client.SendEventAsync(
                    eventType: eventType,
                    sequence: sequence,
                    simulationId: session.SimulationId,
                    orderReference: session.OrderReference,
                    deviceId: session.DeviceId,
                    state: session.State,
                    progress: session.Progress,
                    failureCode: failureCode,
                    failureMessage: failureMessage,
                    images: images);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Background webhook dispatch failed for event {EventType} of session {SimulationId}", eventType, session.SimulationId);
            }
        });
    }
}
