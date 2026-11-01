using Microsoft.AspNetCore.Mvc;
using OZE.XRaySimulator.Api.Contracts;
using OZE.XRaySimulator.Application;
using OZE.XRaySimulator.Domain.Entities;
using OZE.XRaySimulator.Domain.Enums;
using OZE.XRaySimulator.Domain.Models;

namespace OZE.XRaySimulator.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public sealed class CapturesController : ControllerBase
{
    private readonly ICaptureService _captureService;

    public CapturesController(ICaptureService captureService)
    {
        _captureService = captureService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(CaptureResponse), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> CreateCapture(
        [FromBody] CreateCaptureRequest request,
        [FromHeader(Name = "X-Api-Key")] string? apiKey = null,
        CancellationToken cancellationToken = default)
    {
        if (!Enum.TryParse<ImagingModality>(request.Modality, true, out var modality))
        {
            return BadRequest(new { error = $"Invalid modality '{request.Modality}'. Supported: [{string.Join(", ", Enum.GetNames<ImagingModality>())}]." });
        }

        var command = new CreateCaptureCommand(
            CaptureRequestId: request.CaptureRequestId,
            OrderReference: request.OrderReference,
            DeviceId: request.DeviceId,
            Modality: modality,
            BodyRegion: request.BodyRegion,
            ImageCount: request.ImageCount ?? 1,
            Exposure: new ExposureSettings(
                KV: request.Exposure?.KV,
                MA: request.Exposure?.MA,
                Seconds: request.Exposure?.Seconds,
                Mode: request.Exposure?.Mode ?? "STANDARD"
            )
        );

        var result = await _captureService.CreateCaptureSessionAsync(command, cancellationToken);
        if (!result.Success || result.Session == null)
        {
            return StatusCode(result.StatusCode, new { error = result.ErrorMessage });
        }

        var response = MapToResponse(result.Session, result.EstimatedDurationSeconds);
        return StatusCode(StatusCodes.Status202Accepted, response);
    }

    [HttpGet("{simulationId}")]
    [ProducesResponseType(typeof(CaptureResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult GetStatus(
        string simulationId,
        [FromHeader(Name = "X-Api-Key")] string? apiKey = null)
    {
        if (!_captureService.TryGetSession(simulationId, out var session) || session == null)
        {
            return NotFound(new { error = $"Capture session '{simulationId}' was not found." });
        }

        return Ok(MapToResponse(session, 0));
    }

    [HttpPost("{simulationId}/cancel")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public IActionResult CancelCapture(
        string simulationId,
        [FromHeader(Name = "X-Api-Key")] string? apiKey = null)
    {
        if (!_captureService.TryCancelSession(simulationId, out var error))
        {
            if (error != null && error.Contains("not found"))
            {
                return NotFound(new { error });
            }
            return Conflict(new { error });
        }

        return Ok(new { message = $"Session '{simulationId}' cancellation initiated." });
    }

    [HttpGet("{simulationId}/images")]
    [ProducesResponseType(typeof(IReadOnlyList<ImageSummaryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public IActionResult GetSessionImages(
        string simulationId,
        [FromHeader(Name = "X-Api-Key")] string? apiKey = null)
    {
        if (!_captureService.TryGetSession(simulationId, out var session) || session == null)
        {
            return NotFound(new { error = $"Capture session '{simulationId}' was not found." });
        }

        if (session.State != CaptureState.COMPLETED)
        {
            return Conflict(new { error = $"Session '{simulationId}' is not yet COMPLETED (current state: {session.State})." });
        }

        var dtos = session.Images.Select(img => new ImageSummaryDto(
            ImageId: img.ImageId,
            FileName: img.FileName,
            ContentType: img.ContentType,
            SizeBytes: img.SizeBytes,
            SequenceNumber: img.SequenceNumber,
            BodyRegion: img.BodyRegion,
            IsSimulated: img.IsSimulated
        )).ToList();

        return Ok(dtos);
    }

    [HttpGet("{simulationId}/images/{imageId}")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult GetImageBinary(
        string simulationId,
        string imageId,
        [FromHeader(Name = "X-Api-Key")] string? apiKey = null)
    {
        if (!_captureService.TryGetSession(simulationId, out var session) || session == null)
        {
            return NotFound(new { error = $"Capture session '{simulationId}' was not found." });
        }

        var image = session.Images.FirstOrDefault(i => string.Equals(i.ImageId, imageId, StringComparison.OrdinalIgnoreCase));
        if (image == null)
        {
            return NotFound(new { error = $"Image '{imageId}' was not found in session '{simulationId}'." });
        }

        Response.Headers.Append("X-Is-Simulated", "true");
        Response.Headers.Append("X-Modality", image.Modality.ToString());
        return File(image.ImageBytes, image.ContentType, image.FileName);
    }

    private static CaptureResponse MapToResponse(CaptureSession s, int estimatedDuration) =>
        new(
            SimulationId: s.SimulationId,
            CaptureRequestId: s.CaptureRequestId,
            OrderReference: s.OrderReference,
            DeviceId: s.DeviceId,
            Modality: s.Modality.ToString(),
            BodyRegion: s.BodyRegion,
            Status: s.State.ToString(),
            Progress: s.Progress,
            EstimatedDurationSeconds: estimatedDuration,
            FailureCode: s.FailureCode,
            FailureMessage: s.FailureMessage,
            Images: s.Images.Select(i => new ImageSummaryDto(
                ImageId: i.ImageId,
                FileName: i.FileName,
                ContentType: i.ContentType,
                SizeBytes: i.SizeBytes,
                SequenceNumber: i.SequenceNumber,
                BodyRegion: i.BodyRegion,
                IsSimulated: i.IsSimulated
            )).ToList(),
            CreatedAt: s.CreatedAt,
            UpdatedAt: s.UpdatedAt
        );
}
