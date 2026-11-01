namespace OZE.XRaySimulator.Infrastructure.Options;

public sealed class WebhookOptions
{
    public const string SectionName = "Webhook";

    public string Url { get; set; } = "http://localhost:5055/callback";
    public string Secret { get; set; } = "oze-sim-webhook-secret-2026";
    public int MaxRetries { get; set; } = 3;
    public int TimeoutSeconds { get; set; } = 5;
}
