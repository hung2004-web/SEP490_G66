using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var receivedEvents = new ConcurrentQueue<ReceivedWebhookRecord>();
var configuredSecret = builder.Configuration["WebhookSecret"] ?? "oze-sim-webhook-secret-2026";

app.MapPost("/callback", async (HttpContext context) =>
{
    using var reader = new StreamReader(context.Request.Body, Encoding.UTF8);
    var body = await reader.ReadToEndAsync();

    context.Request.Headers.TryGetValue("X-Sim-Signature", out var signature);
    context.Request.Headers.TryGetValue("X-Sim-Timestamp", out var timestamp);
    context.Request.Headers.TryGetValue("X-Sim-Event-Id", out var eventId);

    // Verify HMAC-SHA256
    var expectedSig = ComputeHmacSha256(body, configuredSecret);
    var actualSig = signature.ToString().Replace("sha256=", "", StringComparison.OrdinalIgnoreCase);
    var isSignatureValid = string.Equals(expectedSig, actualSig, StringComparison.OrdinalIgnoreCase);

    var record = new ReceivedWebhookRecord(
        EventId: eventId.ToString(),
        Timestamp: timestamp.ToString(),
        SignatureValid: isSignatureValid,
        RawBody: body,
        ReceivedAt: DateTimeOffset.UtcNow
    );

    receivedEvents.Enqueue(record);

    var statusColor = isSignatureValid ? "[VALID SIGNATURE]" : "[INVALID SIGNATURE]";
    Console.WriteLine($"\n================== WEBHOOK RECEIVED ==================");
    Console.WriteLine($"Event ID:    {eventId} {statusColor}");
    Console.WriteLine($"Timestamp:   {timestamp}");
    Console.WriteLine($"Payload:\n{FormatJson(body)}");
    Console.WriteLine($"======================================================\n");

    return Results.Ok(new { status = "RECEIVED", eventId = eventId.ToString(), signatureValid = isSignatureValid });
});

app.MapGet("/events", () => Results.Ok(receivedEvents.ToArray()));

app.MapDelete("/events", () =>
{
    receivedEvents.Clear();
    return Results.Ok(new { message = "Webhook event history cleared." });
});

app.MapGet("/health", () => Results.Ok(new { status = "UP", service = "MockWebhookReceiver" }));

app.Run();

static string ComputeHmacSha256(string data, string secret)
{
    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
    var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
    return Convert.ToHexString(hash).ToLowerInvariant();
}

static string FormatJson(string json)
{
    try
    {
        using var doc = JsonDocument.Parse(json);
        return JsonSerializer.Serialize(doc, new JsonSerializerOptions { WriteIndented = true });
    }
    catch
    {
        return json;
    }
}

public sealed record ReceivedWebhookRecord(
    string EventId,
    string Timestamp,
    bool SignatureValid,
    string RawBody,
    DateTimeOffset ReceivedAt
);
