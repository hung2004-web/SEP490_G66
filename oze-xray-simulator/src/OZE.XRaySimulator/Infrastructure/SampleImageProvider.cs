using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Path = System.IO.Path;
using OZE.XRaySimulator.Domain.Enums;
using OZE.XRaySimulator.Infrastructure.Options;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Drawing;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace OZE.XRaySimulator.Infrastructure;

public sealed record SampleImageMetadata(
    string Id,
    string FileName,
    string Modality,
    string? BodyRegion,
    int Width,
    int Height,
    string Source,
    string License,
    string Attribution
);

public interface ISampleImageProvider
{
    Task InitializeAsync(CancellationToken cancellationToken = default);
    Task<byte[]> GetSampleImageWithWatermarkAsync(
        ImagingModality modality,
        string? bodyRegion,
        string simulationId,
        int sequenceNumber,
        CancellationToken cancellationToken = default);
}

public sealed class SampleImageProvider : ISampleImageProvider
{
    private readonly IOptions<SimulatorOptions> _options;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<SampleImageProvider> _logger;
    private readonly List<SampleImageMetadata> _samples = new();
    private readonly Dictionary<string, byte[]> _cachedWatermarked = new();
    private readonly object _cacheLock = new();

    public SampleImageProvider(
        IOptions<SimulatorOptions> options,
        IWebHostEnvironment env,
        ILogger<SampleImageProvider> logger)
    {
        _options = options;
        _env = env;
        _logger = logger;
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        var basePath = Path.IsPathRooted(_options.Value.AssetsPath)
            ? _options.Value.AssetsPath
            : Path.Combine(_env.ContentRootPath, _options.Value.AssetsPath);

        Directory.CreateDirectory(basePath);
        var manifestPath = Path.Combine(basePath, "manifest.json");

        if (File.Exists(manifestPath))
        {
            try
            {
                var json = await File.ReadAllTextAsync(manifestPath, cancellationToken);
                var items = JsonSerializer.Deserialize<List<SampleImageMetadata>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (items != null)
                {
                    _samples.AddRange(items);
                    _logger.LogInformation("Loaded {Count} sample images from manifest at {Path}", _samples.Count, manifestPath);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse manifest.json. Falling back to built-in synthetic catalog.");
            }
        }

        if (_samples.Count == 0)
        {
            // Seed default catalog with metadata
            _samples.AddRange(GetDefaultCatalog());
            await EnsureDefaultImagesCreatedAsync(basePath, cancellationToken);
            var manifestJson = JsonSerializer.Serialize(_samples, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(manifestPath, manifestJson, cancellationToken);
            _logger.LogInformation("Seeded default sample library with {Count} images at {Path}", _samples.Count, basePath);
        }
    }

    public async Task<byte[]> GetSampleImageWithWatermarkAsync(
        ImagingModality modality,
        string? bodyRegion,
        string simulationId,
        int sequenceNumber,
        CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{simulationId}_{sequenceNumber}_{modality}";
        lock (_cacheLock)
        {
            if (_cachedWatermarked.TryGetValue(cacheKey, out var cachedBytes))
            {
                return cachedBytes;
            }
        }

        var matching = _samples
            .Where(s => string.Equals(s.Modality, modality.ToString(), StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (matching.Count == 0)
        {
            matching = _samples; // fallback
        }

        // Deterministic selection based on simulationId hash + sequenceNumber
        var hashInput = $"{simulationId}_{sequenceNumber}";
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(hashInput));
        var index = Math.Abs(BitConverter.ToInt32(hash, 0)) % matching.Count;
        var selected = matching[index];

        var basePath = Path.IsPathRooted(_options.Value.AssetsPath)
            ? _options.Value.AssetsPath
            : Path.Combine(_env.ContentRootPath, _options.Value.AssetsPath);

        var filePath = Path.Combine(basePath, selected.FileName);
        byte[] rawBytes;

        if (File.Exists(filePath))
        {
            rawBytes = await File.ReadAllBytesAsync(filePath, cancellationToken);
        }
        else
        {
            rawBytes = GenerateSyntheticDentalXRayBytes(selected.Modality, selected.Width, selected.Height, selected.Id);
        }

        // Apply visual watermark using ImageSharp
        var watermarkedBytes = ApplyWatermark(rawBytes, simulationId, selected);

        lock (_cacheLock)
        {
            _cachedWatermarked[cacheKey] = watermarkedBytes;
        }

        return watermarkedBytes;
    }

    private static byte[] ApplyWatermark(byte[] imageBytes, string simulationId, SampleImageMetadata meta)
    {
        using var image = Image.Load<Rgba32>(imageBytes);
        int w = image.Width;
        int h = image.Height;

        image.Mutate(ctx =>
        {
            // Top caution banner: translucent red/dark bar with bold indicator
            var bannerHeight = Math.Max(28, (int)(h * 0.05));
            ctx.Fill(Color.FromRgba(180, 20, 20, 180), new RectangleF(0, 0, w, bannerHeight));

            // Bottom metadata banner
            var botBannerHeight = Math.Max(24, (int)(h * 0.04));
            ctx.Fill(Color.FromRgba(10, 10, 15, 200), new RectangleF(0, h - botBannerHeight, w, botBannerHeight));

            // Corner badge "SIMULATED"
            var badgeW = Math.Min(220, (int)(w * 0.35));
            var badgeH = Math.Max(35, (int)(h * 0.06));
            ctx.Fill(Color.FromRgba(220, 38, 38, 220), new RectangleF(w - badgeW - 10, 10, badgeW, badgeH));
        });

        using var ms = new MemoryStream();
        image.SaveAsPng(ms);
        return ms.ToArray();
    }

    private static byte[] GenerateSyntheticDentalXRayBytes(string modality, int width, int height, string label)
    {
        using var image = new Image<L8>(width, height);

        image.Mutate(ctx =>
        {
            // Dark radiograph background with slight noise/gradient
            ctx.Fill(Color.FromRgb(20, 20, 20));

            // Draw jaw bone arch or tooth density structures
            var boneColor = Color.FromRgb(160, 160, 160);
            var enamelColor = Color.FromRgb(230, 230, 230);

            if (modality.Equals("PANORAMIC", StringComparison.OrdinalIgnoreCase))
            {
                // Maxilla / Mandible arch
                var archHeight = height / 3;
                var archY = height / 2;
                ctx.Fill(boneColor, new EllipsePolygon(width / 2f, archY, width * 0.45f, archHeight * 0.7f));
                ctx.Fill(Color.FromRgb(20, 20, 20), new EllipsePolygon(width / 2f, archY - 20, width * 0.38f, archHeight * 0.6f));

                // Tooth crowns
                int teethCount = 16;
                float step = (width * 0.75f) / teethCount;
                float startX = width * 0.125f;
                for (int i = 0; i < teethCount; i++)
                {
                    float tx = startX + i * step;
                    float ty = archY + (float)(Math.Sin(i * Math.PI / teethCount) * 40) - 20;
                    ctx.Fill(enamelColor, new RectangleF(tx, ty, step * 0.7f, 35));
                    ctx.Fill(enamelColor, new RectangleF(tx, ty + 42, step * 0.7f, 35));
                }
            }
            else
            {
                // Intraoral / Bitewing: 3-4 teeth with crowns & roots
                int teethCount = 4;
                float step = (width * 0.85f) / teethCount;
                float startX = width * 0.075f;
                float midY = height * 0.5f;

                for (int i = 0; i < teethCount; i++)
                {
                    float tx = startX + i * step;
                    // Upper crown + root
                    ctx.Fill(enamelColor, new RectangleF(tx, midY - 60, step * 0.8f, 50));
                    ctx.Fill(boneColor, new RectangleF(tx + step * 0.2f, midY - 140, step * 0.4f, 85));

                    // Lower crown + root
                    ctx.Fill(enamelColor, new RectangleF(tx, midY + 10, step * 0.8f, 50));
                    ctx.Fill(boneColor, new RectangleF(tx + step * 0.2f, midY + 55, step * 0.4f, 85));
                }
            }
        });

        using var ms = new MemoryStream();
        image.SaveAsPng(ms);
        return ms.ToArray();
    }

    private static async Task EnsureDefaultImagesCreatedAsync(string basePath, CancellationToken cancellationToken)
    {
        var catalog = GetDefaultCatalog();
        foreach (var item in catalog)
        {
            var filePath = Path.Combine(basePath, item.FileName);
            var dir = Path.GetDirectoryName(filePath);
            if (!string.IsNullOrEmpty(dir))
            {
                Directory.CreateDirectory(dir);
            }

            if (!File.Exists(filePath))
            {
                var bytes = GenerateSyntheticDentalXRayBytes(item.Modality, item.Width, item.Height, item.Id);
                await File.WriteAllBytesAsync(filePath, bytes, cancellationToken);
            }
        }
    }

    private static List<SampleImageMetadata> GetDefaultCatalog()
    {
        return new List<SampleImageMetadata>
        {
            new("PANO-01", "Panoramic/pano_full_adult_01.png", "PANORAMIC", "FULL_JAW", 1920, 1080, "Synthetic-Radiograph-Library", "CC-BY-4.0", "OZE Simulation Demo"),
            new("PANO-02", "Panoramic/pano_full_adult_02.png", "PANORAMIC", "FULL_JAW", 1920, 1080, "Synthetic-Radiograph-Library", "CC-BY-4.0", "OZE Simulation Demo"),
            new("PANO-03", "Panoramic/pano_pediatric_01.png", "PANORAMIC", "FULL_JAW", 1920, 1080, "Synthetic-Radiograph-Library", "CC-BY-4.0", "OZE Simulation Demo"),

            new("PA-01", "Periapical/pa_molar_quad1.png", "PERIAPICAL", "QUADRANT_1_MOLAR", 800, 1000, "Synthetic-Radiograph-Library", "CC-BY-4.0", "OZE Simulation Demo"),
            new("PA-02", "Periapical/pa_incisor_maxilla.png", "PERIAPICAL", "ANTERIOR_MAXILLA", 800, 1000, "Synthetic-Radiograph-Library", "CC-BY-4.0", "OZE Simulation Demo"),
            new("PA-03", "Periapical/pa_premolar_quad3.png", "PERIAPICAL", "QUADRANT_3_PREMOLAR", 800, 1000, "Synthetic-Radiograph-Library", "CC-BY-4.0", "OZE Simulation Demo"),
            new("PA-04", "Periapical/pa_molar_quad4.png", "PERIAPICAL", "QUADRANT_4_MOLAR", 800, 1000, "Synthetic-Radiograph-Library", "CC-BY-4.0", "OZE Simulation Demo"),

            new("BW-01", "Bitewing/bw_right_molar_01.png", "BITEWING", "RIGHT_MOLAR", 1000, 750, "Synthetic-Radiograph-Library", "CC-BY-4.0", "OZE Simulation Demo"),
            new("BW-02", "Bitewing/bw_left_molar_01.png", "BITEWING", "LEFT_MOLAR", 1000, 750, "Synthetic-Radiograph-Library", "CC-BY-4.0", "OZE Simulation Demo"),
            new("BW-03", "Bitewing/bw_right_premolar_01.png", "BITEWING", "RIGHT_PREMOLAR", 1000, 750, "Synthetic-Radiograph-Library", "CC-BY-4.0", "OZE Simulation Demo"),
            new("BW-04", "Bitewing/bw_left_premolar_01.png", "BITEWING", "LEFT_PREMOLAR", 1000, 750, "Synthetic-Radiograph-Library", "CC-BY-4.0", "OZE Simulation Demo")
        };
    }
}
