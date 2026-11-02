namespace OZE.XRaySimulator.Domain.Models;

public sealed record ExposureSettings(
    double? KV = null,
    double? MA = null,
    double? Seconds = null,
    string? Mode = "STANDARD"
);
