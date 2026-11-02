using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using OZE.XRaySimulator.Domain.Enums;
using OZE.XRaySimulator.Infrastructure.Options;

namespace OZE.XRaySimulator.Infrastructure;

public sealed record WebhookImageSummary(
    [property: JsonPropertyName("imageId")] string ImageId,
    [property: JsonPropertyName("fileName")] string FileName,
    [property: JsonPropertyName("contentType")] string ContentType,
    [property: JsonPropertyName("sizeBytes")] long SizeBytes,
    [property: JsonPropertyName("sequenceNumber")] int SequenceNumber
);

public sealed record WebhookPayload(
    [property: JsonPropertyName("eventId")] string EventId,
    [property: JsonPropertyName("eventType")] string EventType,
    [property: JsonPropertyName("sequence")] int Sequence,
    [property: JsonPropertyName("simulationId")] string SimulationId,
    [property: JsonPropertyName("orderReference")] string OrderReference,
    [property: JsonPropertyName("deviceId")] string DeviceId,
    [property: JsonPropertyName("state")] string State,
    [property: JsonPropertyName("progress")] int Progress,
    [property: JsonPropertyName("failureCode")] string? FailureCode,
    [property: JsonPropertyName("failureMessage")] string? FailureMessage,
    [property: JsonPropertyName("images")] IReadOnlyList<WebhookImageSummary> Images,
    [property: JsonPropertyName("occurredAt")] DateTimeOffset OccurredAt
);

public interface IWebhookClient
{
    Task SendEventAsync(
        string eventType,
        int sequence,
        string simulationId,
        string orderReference,
        string deviceId,
        CaptureState state,
        int progress,
        string? failureCode = null,
        string? failureMessage = null,
        IReadOnlyList<WebhookImageSummary>? images = null,
        CancellationToken cancellationToken = default);
}

public sealed class WebhookClient : IWebhookClient
{
    private readonly HttpClient _httpClient;
    private readonly IOptions<WebhookOptions> _options;
    private readonly ILogger<WebhookClient> _logger;

    public WebhookClient(
        HttpClient httpClient,
        IOptions<WebhookOptions> options,
        ILogger<WebhookClient> logger)
    {
        _httpClient = httpClient;
        _options = options;
        _logger = logger;
    }

    public async Task SendEventAsync(
        string eventType,
        int sequence,
        string simulationId,
        string orderReference,
        string deviceId,
        CaptureState state,
        int progress,
        string? failureCode = null,
        string? failureMessage = null,
        IReadOnlyList<WebhookImageSummary>? images = null,
        CancellationToken cancellationToken = default)
    {
        var targetUrl = _options.Value.Url;
        if (string.IsNullOrWhiteSpace(targetUrl))
        {
            _logger.LogWarning("Webhook URL is not configured. Skipping webhook dispatch.");
            return;
        }

        var eventId = $"evt-{Guid.NewGuid():N}";
        var now = DateTimeOffset.UtcNow;
        var payload = new WebhookPayload(
            EventId: eventId,
            EventType: eventType,
            Sequence: sequence,
            SimulationId: simulationId,
            OrderReference: orderReference,
            DeviceId: deviceId,
            State: state.ToString(),
            Progress: progress,
            FailureCode: failureCode,
            FailureMessage: failureMessage,
            Images: images ?? Array.Empty<WebhookImageSummary>(),
            OccurredAt: now
        );

        var json = JsonSerializer.Serialize(payload);
        var signature = ComputeHmacSha256(json, _options.Value.Secret);

        int maxRetries = Math.Max(1, _options.Value.MaxRetries);
        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, targetUrl)
                {
                    Content = new StringContent(json, Encoding.UTF8, "application/json")
                };

                request.Headers.Add("X-Sim-Signature", $"sha256={signature}");
                request.Headers.Add("X-Sim-Timestamp", now.ToString("O"));
                request.Headers.Add("X-Sim-Event-Id", eventId);

                using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(_options.Value.TimeoutSeconds));
                using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);

                var response = await _httpClient.SendAsync(request, linkedCts.Token);
                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Webhook event {EventId} ({EventType}) dispatched successfully (attempt {Attempt}).", eventId, eventType, attempt);
                    return;
                }

                _logger.LogWarning("Webhook target returned status code {StatusCode} on attempt {Attempt}", response.StatusCode, attempt);
            }
            catch (Exception ex) when (attempt < maxRetries && !cancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning(ex, "Failed to send webhook event {EventId} (attempt {Attempt}/{MaxRetries}). Retrying...", eventId, attempt, maxRetries);
                await Task.Delay(TimeSpan.FromMilliseconds(500 * Math.Pow(2, attempt - 1)), cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to deliver webhook event {EventId} after {Attempt} attempts.", eventId, attempt);
                break;
            }
        }
    }

    public static string ComputeHmacSha256(string data, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
