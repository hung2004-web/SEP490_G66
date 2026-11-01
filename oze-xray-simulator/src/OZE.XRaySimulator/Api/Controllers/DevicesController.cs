using Microsoft.AspNetCore.Mvc;
using OZE.XRaySimulator.Api.Contracts;
using OZE.XRaySimulator.Application;
using OZE.XRaySimulator.Domain.Entities;

namespace OZE.XRaySimulator.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public sealed class DevicesController : ControllerBase
{
    private readonly IDeviceManager _deviceManager;

    public DevicesController(IDeviceManager deviceManager)
    {
        _deviceManager = deviceManager;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<DeviceResponse>), StatusCodes.Status200OK)]
    public IActionResult GetAll([FromHeader(Name = "X-Api-Key")] string? apiKey = null)
    {
        var devices = _deviceManager.GetAllDevices()
            .Select(MapToResponse)
            .ToList();

        return Ok(devices);
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(DeviceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult GetById(string id, [FromHeader(Name = "X-Api-Key")] string? apiKey = null)
    {
        if (!_deviceManager.TryGetDevice(id, out var device) || device == null)
        {
            return NotFound(new { error = $"Device '{id}' was not found." });
        }

        return Ok(MapToResponse(device));
    }

    private static DeviceResponse MapToResponse(Device d) =>
        new(
            Id: d.Id,
            Name: d.Name,
            Model: d.Model,
            SerialNumber: d.SerialNumber,
            SupportedModalities: d.SupportedModalities.Select(m => m.ToString()).ToList(),
            State: d.State.ToString(),
            CurrentSimulationId: d.CurrentSimulationId,
            LastError: d.LastError,
            UpdatedAt: d.UpdatedAt
        );
}
