using System.ComponentModel.DataAnnotations;

namespace OZE.XRaySimulator.Api.Contracts;

public sealed record ExposureRequest(
    double? KV,
    double? MA,
    double? Seconds,
    string? Mode
);

public sealed record CreateCaptureRequest
{
    [Required]
    public required string CaptureRequestId { get; init; }

    [Required]
    public required string OrderReference { get; init; }

    [Required]
    public required string DeviceId { get; init; }

    [Required]
    public required string Modality { get; init; }

    public string? BodyRegion { get; init; }

    public int? ImageCount { get; init; }

    public ExposureRequest? Exposure { get; init; }
}

public sealed record ImageSummaryDto(
    string ImageId,
    string FileName,
    string ContentType,
    long SizeBytes,
    int SequenceNumber,
    string? BodyRegion,
    bool IsSimulated
);

public sealed record CaptureResponse(
    string SimulationId,
    string CaptureRequestId,
    string OrderReference,
    string DeviceId,
    string Modality,
    string? BodyRegion,
    string Status,
    int Progress,
    int EstimatedDurationSeconds,
    string? FailureCode,
    string? FailureMessage,
    IReadOnlyList<ImageSummaryDto> Images,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

public sealed record DeviceResponse(
    string Id,
    string Name,
    string Model,
    string SerialNumber,
    IReadOnlyList<string> SupportedModalities,
    string State,
    string? CurrentSimulationId,
    string? LastError,
    DateTimeOffset UpdatedAt
);

public sealed record SetDeviceStateRequest(
    [Required] string State,
    string? Reason
);

public sealed record InjectFaultRequest(
    [Required] string FailureCode,
    [Required] string FailureMessage
);
