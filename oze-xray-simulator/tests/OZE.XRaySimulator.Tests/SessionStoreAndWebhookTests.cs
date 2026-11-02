using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using OZE.XRaySimulator.Domain.Entities;
using OZE.XRaySimulator.Domain.Enums;
using OZE.XRaySimulator.Domain.Models;
using OZE.XRaySimulator.Infrastructure;
using OZE.XRaySimulator.Infrastructure.Options;

namespace OZE.XRaySimulator.Tests;

public class SessionStoreTests
{
    [Fact]
    public void SessionStore_Idempotency_ShouldReturnSameSessionForSameRequestId()
    {
        var options = Microsoft.Extensions.Options.Options.Create(new SimulatorOptions { SessionTtlMinutes = 60 });
        var store = new SessionStore(options, NullLogger<SessionStore>.Instance);

        var session1 = new CaptureSession("SIM-01", "REQ-ABC", "ORD-1", "DEV-1", ImagingModality.PANORAMIC, null, 1, new ExposureSettings());
        var session2 = new CaptureSession("SIM-02", "REQ-ABC", "ORD-1", "DEV-1", ImagingModality.PANORAMIC, null, 1, new ExposureSettings());

        var added1 = store.GetOrAdd(session1);
        var added2 = store.GetOrAdd(session2);

        added1.SimulationId.Should().Be("SIM-01");
        added2.SimulationId.Should().Be("SIM-01"); // Idempotent: returns existing session1
    }

    [Fact]
    public void WebhookClient_ComputeHmacSha256_ShouldGenerateDeterministicSignature()
    {
        var secret = "test-secret-123";
        var payload = "{\"test\": \"payload\"}";

        var sig1 = WebhookClient.ComputeHmacSha256(payload, secret);
        var sig2 = WebhookClient.ComputeHmacSha256(payload, secret);

        sig1.Should().NotBeNullOrEmpty();
        sig1.Should().Be(sig2);

        var sigDifferentSecret = WebhookClient.ComputeHmacSha256(payload, "different-secret");
        sig1.Should().NotBe(sigDifferentSecret);
    }
}
