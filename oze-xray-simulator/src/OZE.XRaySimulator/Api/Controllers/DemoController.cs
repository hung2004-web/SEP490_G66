using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using OZE.XRaySimulator.Api.Contracts;
using OZE.XRaySimulator.Application;
using OZE.XRaySimulator.Domain.Enums;
using OZE.XRaySimulator.Infrastructure.Options;

namespace OZE.XRaySimulator.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public sealed class DemoController : ControllerBase
{
    private readonly IDeviceManager _deviceManager;
    private readonly IFaultInjector _faultInjector;
    private readonly IOptions<SimulatorOptions> _options;

    public DemoController(
        IDeviceManager deviceManager,
        IFaultInjector faultInjector,
        IOptions<SimulatorOptions> options)
    {
        _deviceManager = deviceManager;
        _faultInjector = faultInjector;
        _options = options;
    }

    [HttpPost("devices/{id}/state")]
    public IActionResult SetDeviceState(
        string id,
        [FromBody] SetDeviceStateRequest request,
        [FromHeader(Name = "X-Api-Key")] string? apiKey = null)
    {
        if (!_options.Value.EnableDemoControls)
        {
            return Forbid();
        }

        if (!Enum.TryParse<DeviceState>(request.State, true, out var targetState))
        {
            return BadRequest(new { error = $"Invalid device state '{request.State}'." });
        }

        if (!_deviceManager.TryGetDevice(id, out var device) || device == null)
        {
            return NotFound(new { error = $"Device '{id}' was not found." });
        }

        try
        {
            _deviceManager.SetDeviceState(id, targetState, request.Reason);
            return Ok(new { message = $"Device '{id}' transitioned to '{targetState}'." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("faults/next-capture")]
    public IActionResult InjectNextCaptureFault(
        [FromBody] InjectFaultRequest request,
        [FromHeader(Name = "X-Api-Key")] string? apiKey = null)
    {
        if (!_options.Value.EnableDemoControls)
        {
            return Forbid();
        }

        _faultInjector.InjectNextCaptureFailure(request.FailureCode, request.FailureMessage);
        return Ok(new { message = $"Next capture will fail with [{request.FailureCode}]: {request.FailureMessage}" });
    }

    [HttpPost("faults/webhook-delay")]
    public IActionResult SetWebhookDelay(
        [FromQuery] int milliseconds,
        [FromHeader(Name = "X-Api-Key")] string? apiKey = null)
    {
        if (!_options.Value.EnableDemoControls)
        {
            return Forbid();
        }

        _faultInjector.SetWebhookDelay(milliseconds);
        return Ok(new { message = $"Webhook dispatch delay set to {milliseconds}ms." });
    }

    [HttpPost("faults/drop-webhooks")]
    public IActionResult SetDropWebhooks(
        [FromQuery] bool drop,
        [FromHeader(Name = "X-Api-Key")] string? apiKey = null)
    {
        if (!_options.Value.EnableDemoControls)
        {
            return Forbid();
        }

        _faultInjector.SetDropWebhooks(drop);
        return Ok(new { message = $"Drop webhooks is now {(drop ? "ENABLED (webhooks will be lost)" : "DISABLED")}" });
    }

    [HttpGet("faults")]
    public IActionResult GetFaults([FromHeader(Name = "X-Api-Key")] string? apiKey = null)
    {
        if (!_options.Value.EnableDemoControls)
        {
            return Forbid();
        }

        return Ok(_faultInjector.CurrentConfig);
    }

    [HttpDelete("faults")]
    public IActionResult ClearFaults([FromHeader(Name = "X-Api-Key")] string? apiKey = null)
    {
        if (!_options.Value.EnableDemoControls)
        {
            return Forbid();
        }

        _faultInjector.ClearAllFaults();
        return Ok(new { message = "All injected faults cleared." });
    }
}
