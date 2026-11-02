using System.Text.Json;
using OZE.XRaySimulator.Domain.Entities;
using OZE.XRaySimulator.Domain.Models;
using OZE.XRaySimulator.Infrastructure;

namespace OZE.XRaySimulator.Application;

public interface IAcquisitionService
{
    Task<IReadOnlyList<WebhookImageSummary>> AcquireImagesForSessionAsync(
        CaptureSession session,
        Device device,
        CancellationToken cancellationToken = default);
}

public sealed class AcquisitionService : IAcquisitionService
{
    private readonly ISampleImageProvider _sampleImageProvider;
    private readonly ILogger<AcquisitionService> _logger;

    public AcquisitionService(
        ISampleImageProvider sampleImageProvider,
        ILogger<AcquisitionService> logger)
    {
        _sampleImageProvider = sampleImageProvider;
        _logger = logger;
    }

    public async Task<IReadOnlyList<WebhookImageSummary>> AcquireImagesForSessionAsync(
        CaptureSession session,
        Device device,
        CancellationToken cancellationToken = default)
    {
        var summaries = new List<WebhookImageSummary>();
        var now = DateTimeOffset.UtcNow;

        for (int i = 1; i <= session.ImageCount; i++)
        {
            var imageBytes = await _sampleImageProvider.GetSampleImageWithWatermarkAsync(
                session.Modality,
                session.BodyRegion,
                session.SimulationId,
                i,
                cancellationToken);

            var imageId = $"IMG-{session.SimulationId}-{i}";
            var fileName = $"{session.Modality.ToString().ToLowerInvariant()}_{session.SimulationId}_{i}.png";

            // DICOM-aligned simulated tag metadata
            var metadata = new Dictionary<string, object?>
            {
                ["Modality"] = session.Modality == Domain.Enums.ImagingModality.PANORAMIC ? "PX" : "IO",
                ["BodyPartExamined"] = session.BodyRegion ?? "JAW",
                ["KVP"] = session.Exposure.KV ?? 70.0,
                ["XRayTubeCurrent"] = session.Exposure.MA ?? 10.0,
                ["ExposureTime"] = session.Exposure.Seconds ?? 12.0,
                ["AcquisitionDateTime"] = now.ToString("O"),
                ["Manufacturer"] = "OZE Simulated Devices Inc.",
                ["DeviceSerialNumber"] = device.SerialNumber,
                ["StationName"] = device.Name,
                ["SeriesNumber"] = 1,
                ["InstanceNumber"] = i,
                ["IsSimulated"] = true,
                ["SimulationNotice"] = "DEMO ACQUISITION ONLY - NOT FOR DIAGNOSTIC USE",
                ["OrderReference"] = session.OrderReference,
                ["SimulationId"] = session.SimulationId
            };

            var captureImage = new CaptureImage
            {
                ImageId = imageId,
                FileName = fileName,
                ContentType = "image/png",
                SizeBytes = imageBytes.LongLength,
                Modality = session.Modality,
                BodyRegion = session.BodyRegion,
                SequenceNumber = i,
                IsSimulated = true,
                MetadataJson = JsonSerializer.Serialize(metadata, new JsonSerializerOptions { WriteIndented = true }),
                ImageBytes = imageBytes
            };

            session.AddImage(captureImage);

            summaries.Add(new WebhookImageSummary(
                ImageId: imageId,
                FileName: fileName,
                ContentType: "image/png",
                SizeBytes: imageBytes.LongLength,
                SequenceNumber: i
            ));
        }

        _logger.LogInformation("Acquisition completed for session {SimulationId}. {Count} simulated image(s) created.", session.SimulationId, summaries.Count);
        return summaries.AsReadOnly();
    }
}
