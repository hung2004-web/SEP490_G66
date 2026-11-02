using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace OZE.Common.Models
{
    public class WebhookImageSummaryDto
    {
        [JsonPropertyName("imageId")]
        public string ImageId { get; set; } = string.Empty;

        [JsonPropertyName("fileName")]
        public string FileName { get; set; } = string.Empty;

        [JsonPropertyName("contentType")]
        public string ContentType { get; set; } = string.Empty;

        [JsonPropertyName("sizeBytes")]
        public long SizeBytes { get; set; }

        [JsonPropertyName("sequenceNumber")]
        public int SequenceNumber { get; set; }
    }

    public class ImagingSimulatorWebhookPayload
    {
        [JsonPropertyName("eventId")]
        public string EventId { get; set; } = string.Empty;

        [JsonPropertyName("eventType")]
        public string EventType { get; set; } = string.Empty;

        [JsonPropertyName("sequence")]
        public int Sequence { get; set; }

        [JsonPropertyName("simulationId")]
        public string SimulationId { get; set; } = string.Empty;

        [JsonPropertyName("orderReference")]
        public string OrderReference { get; set; } = string.Empty;

        [JsonPropertyName("deviceId")]
        public string DeviceId { get; set; } = string.Empty;

        [JsonPropertyName("state")]
        public string State { get; set; } = string.Empty;

        [JsonPropertyName("progress")]
        public int Progress { get; set; }

        [JsonPropertyName("failureCode")]
        public string? FailureCode { get; set; }

        [JsonPropertyName("failureMessage")]
        public string? FailureMessage { get; set; }

        [JsonPropertyName("images")]
        public List<WebhookImageSummaryDto> Images { get; set; } = new();

        [JsonPropertyName("occurredAt")]
        public DateTimeOffset OccurredAt { get; set; }
    }
}
