using OZE.XRaySimulator.Domain.Enums;

namespace OZE.XRaySimulator.Domain.Models;

public sealed class CaptureImage
{
    public required string ImageId { get; init; }
    public required string FileName { get; init; }
    public required string ContentType { get; init; }
    public required long SizeBytes { get; init; }
    public required ImagingModality Modality { get; init; }
    public string? BodyRegion { get; init; }
    public int SequenceNumber { get; init; } = 1;
    public bool IsSimulated { get; init; } = true;
    public required string MetadataJson { get; init; }
    public required byte[] ImageBytes { get; init; }
}
