namespace OZE.XRaySimulator.Infrastructure.Options;

public sealed class SimulatorOptions
{
    public const string SectionName = "Simulator";

    public string ApiKey { get; set; } = "oze-xray-sim-secret-key-2026";
    public bool EnableDemoControls { get; set; } = true;
    public int CaptureSeconds { get; set; } = 3;
    public int ProcessingSeconds { get; set; } = 4;
    public int SessionTtlMinutes { get; set; } = 60;
    public string AssetsPath { get; set; } = "Assets/Samples";
}
