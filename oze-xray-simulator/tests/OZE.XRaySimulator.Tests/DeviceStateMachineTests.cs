using FluentAssertions;
using OZE.XRaySimulator.Domain.Entities;
using OZE.XRaySimulator.Domain.Enums;
using OZE.XRaySimulator.Domain.Exceptions;

namespace OZE.XRaySimulator.Tests;

public class DeviceStateMachineTests
{
    [Fact]
    public void Device_InitialState_ShouldBeOffline()
    {
        var device = new Device("TEST-01", "Test Device", "SN-001", new[] { ImagingModality.PANORAMIC });
        device.State.Should().Be(DeviceState.OFFLINE);
    }

    [Fact]
    public void Device_HappyPathTransitions_ShouldSucceed()
    {
        var device = new Device("TEST-01", "Test Device", "SN-001", new[] { ImagingModality.PANORAMIC });

        device.TransitionTo(DeviceState.INITIALIZING);
        device.State.Should().Be(DeviceState.INITIALIZING);

        device.TransitionTo(DeviceState.READY);
        device.State.Should().Be(DeviceState.READY);

        var reserved = device.TryReserve("SIM-101", out var error);
        reserved.Should().BeTrue();
        error.Should().BeNull();
        device.State.Should().Be(DeviceState.BUSY);
        device.CurrentSimulationId.Should().Be("SIM-101");

        device.Release("SIM-101");
        device.State.Should().Be(DeviceState.READY);
        device.CurrentSimulationId.Should().BeNull();
    }

    [Fact]
    public void Device_InvalidTransition_ShouldThrowException()
    {
        var device = new Device("TEST-01", "Test Device", "SN-001", new[] { ImagingModality.PANORAMIC });
        // OFFLINE directly to BUSY is invalid
        var act = () => device.TransitionTo(DeviceState.BUSY);
        act.Should().Throw<InvalidStateTransitionException>()
            .WithMessage("*cannot transition from 'OFFLINE' to 'BUSY'*");
    }

    [Fact]
    public void Device_WhenBusy_SecondReservationShouldFail()
    {
        var device = new Device("TEST-01", "Test Device", "SN-001", new[] { ImagingModality.PANORAMIC });
        device.TransitionTo(DeviceState.INITIALIZING);
        device.TransitionTo(DeviceState.READY);

        var first = device.TryReserve("SIM-101", out var err1);
        first.Should().BeTrue();

        var second = device.TryReserve("SIM-102", out var err2);
        second.Should().BeFalse();
        err2.Should().Contain("not READY");
    }
}
