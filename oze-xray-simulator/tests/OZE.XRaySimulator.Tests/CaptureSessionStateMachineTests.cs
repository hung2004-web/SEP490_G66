using FluentAssertions;
using OZE.XRaySimulator.Domain.Entities;
using OZE.XRaySimulator.Domain.Enums;
using OZE.XRaySimulator.Domain.Exceptions;
using OZE.XRaySimulator.Domain.Models;

namespace OZE.XRaySimulator.Tests;

public class CaptureSessionStateMachineTests
{
    private static CaptureSession CreateTestSession() =>
        new(
            simulationId: "SIM-01",
            captureRequestId: "REQ-01",
            orderReference: "ORD-01",
            deviceId: "XR-PANO-01",
            modality: ImagingModality.PANORAMIC,
            bodyRegion: "FULL_JAW",
            imageCount: 1,
            exposure: new ExposureSettings(70, 10, 12, "STANDARD")
        );

    [Fact]
    public void Session_InitialState_ShouldBeAccepted()
    {
        var session = CreateTestSession();
        session.State.Should().Be(CaptureState.ACCEPTED);
        session.Progress.Should().Be(0);
    }

    [Fact]
    public void Session_HappyPathTransitions_ShouldSucceed()
    {
        var session = CreateTestSession();

        session.TransitionTo(CaptureState.CAPTURING);
        session.State.Should().Be(CaptureState.CAPTURING);

        session.SetProgress(50);
        session.Progress.Should().Be(50);

        session.TransitionTo(CaptureState.PROCESSING);
        session.State.Should().Be(CaptureState.PROCESSING);

        session.TransitionTo(CaptureState.COMPLETED);
        session.State.Should().Be(CaptureState.COMPLETED);
        session.Progress.Should().Be(100);
        session.CompletedAt.Should().NotBeNull();
    }

    [Fact]
    public void Session_InvalidTransition_ShouldThrowException()
    {
        var session = CreateTestSession();

        // Direct ACCEPTED to COMPLETED without CAPTURING/PROCESSING is invalid
        var act = () => session.TransitionTo(CaptureState.COMPLETED);
        act.Should().Throw<InvalidStateTransitionException>()
            .WithMessage("*cannot transition from 'ACCEPTED' to 'COMPLETED'*");
    }

    [Fact]
    public void Session_FailureTransition_ShouldRecordFailureDetails()
    {
        var session = CreateTestSession();
        session.TransitionTo(CaptureState.CAPTURING);
        session.TransitionTo(CaptureState.FAILED, "SENSOR_TIMEOUT", "Sensor timed out.");

        session.State.Should().Be(CaptureState.FAILED);
        session.FailureCode.Should().Be("SENSOR_TIMEOUT");
        session.FailureMessage.Should().Be("Sensor timed out.");
    }
}
