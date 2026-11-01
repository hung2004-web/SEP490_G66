using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using OZE.XRaySimulator.Api.Contracts;

namespace OZE.XRaySimulator.Tests;

public class IntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private const string ApiKey = "oze-xray-sim-secret-key-2026";

    public IntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task HealthEndpoint_ShouldReturnOkWithoutAuth()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task DevicesEndpoint_WithoutApiKey_ShouldReturn401()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/devices");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task DevicesEndpoint_WithValidApiKey_ShouldReturnDevices()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", ApiKey);

        var response = await client.GetAsync("/api/v1/devices");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var devices = await response.Content.ReadFromJsonAsync<List<DeviceResponse>>();
        devices.Should().NotBeNull();
        devices!.Should().NotBeEmpty();
        devices.Should().Contain(d => d.Id == "XR-PANO-01");
    }

    [Fact]
    public async Task EndToEnd_PanoramicCaptureFlow_ShouldCompleteAndProduceImage()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", ApiKey);

        // 1. Initiate capture
        var requestId = $"REQ-{Guid.NewGuid():N}";
        var request = new CreateCaptureRequest
        {
            CaptureRequestId = requestId,
            OrderReference = "ORD-TEST-001",
            DeviceId = "XR-PANO-01",
            Modality = "PANORAMIC",
            BodyRegion = "FULL_JAW",
            ImageCount = 1,
            Exposure = new ExposureRequest(70, 10, 12, "STANDARD")
        };

        var postResponse = await client.PostAsJsonAsync("/api/v1/captures", request);
        postResponse.StatusCode.Should().Be(HttpStatusCode.Accepted);

        var created = await postResponse.Content.ReadFromJsonAsync<CaptureResponse>();
        created.Should().NotBeNull();
        created!.SimulationId.Should().StartWith("SIM-");

        // 2. Poll until COMPLETED or timeout
        CaptureResponse? latest = null;
        for (int i = 0; i < 20; i++)
        {
            await Task.Delay(1000);
            var pollResponse = await client.GetAsync($"/api/v1/captures/{created.SimulationId}");
            pollResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            latest = await pollResponse.Content.ReadFromJsonAsync<CaptureResponse>();
            if (latest?.Status == "COMPLETED")
            {
                break;
            }
        }

        latest.Should().NotBeNull();
        latest!.Status.Should().Be("COMPLETED");
        latest.Progress.Should().Be(100);
        latest.Images.Should().HaveCount(1);

        // 3. Download the generated image binary
        var imageId = latest.Images[0].ImageId;
        var imageResponse = await client.GetAsync($"/api/v1/captures/{created.SimulationId}/images/{imageId}");
        imageResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        imageResponse.Content.Headers.ContentType?.MediaType.Should().Be("image/png");

        var bytes = await imageResponse.Content.ReadAsByteArrayAsync();
        bytes.Should().NotBeEmpty();
        bytes.Length.Should().BeGreaterThan(1000); // realistic image size
    }
}
