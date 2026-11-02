namespace OZE.XRaySimulator.Infrastructure.Options;

public sealed class DeviceConfig
{
    public required string Id { get; set; }
    public required string Name { get; set; }
    public string SerialNumber { get; set; } = "SN-SIM-001";
    public List<string> Modalities { get; set; } = new();
}
