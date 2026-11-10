using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.Appointments
{
    // OZ-APPT-12 CancelAppointment
    [Trait("Tab", "OZ-APPT-12")]
    public class CancelAppointmentTests : AppointmentFollowUpTestBase
    {
        [Fact]
        public async Task CancelAppointmentAsync_ShouldClearFollowUpAppointmentId_OnParentExamination()
        {
            var original = CreateOriginalAppointment();
            var followUpAppointment = new Appointment
            {
                Id = 777,
                Status = AppointmentConstants.PendingStatus,
                AppointmentDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(5)),
                ParentAppointmentId = OriginalAppointmentId,
                ParentAppointment = original
            };
            original.Examination!.FollowUpAppointmentId = 777;

            _appointmentRepoMock
                .Setup(r => r.GetByIdWithDetailsAsync(777, It.IsAny<CancellationToken>()))
                .ReturnsAsync(followUpAppointment);

            var cancelRequest = new CancelAppointmentRequest { Reason = "Bận việc đột xuất" };
            var result = await _service.CancelAppointmentAsync(777, cancelRequest, "staff-1", null);

            result.Should().NotBeNull();
            followUpAppointment.Status.Should().Be(AppointmentConstants.CancelledStatus);
            original.Examination.FollowUpAppointmentId.Should().BeNull();
        }
    }
}
