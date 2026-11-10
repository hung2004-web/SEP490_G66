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
    // OZ-APPT-13 RescheduleAppointment
    [Trait("Tab", "OZ-APPT-13")]
    public class RescheduleAppointmentTests : AppointmentFollowUpTestBase
    {
        [Fact]
        public async Task RescheduleAppointmentAsync_ShouldUpdateFollowUpDate_OnParentExamination()
        {
            var original = CreateOriginalAppointment();
            var oldDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(5));
            var newDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(10));
            var newSlotStart = new TimeOnly(9, 0);

            var followUpAppointment = new Appointment
            {
                Id = 888,
                Status = AppointmentConstants.ConfirmedStatus,
                AppointmentDate = oldDate,
                TimeSlotStart = new TimeOnly(8, 0),
                TimeSlotEnd = new TimeOnly(8, 30),
                DoctorId = DoctorId,
                ParentAppointmentId = OriginalAppointmentId,
                ParentAppointment = original,
                ServiceItems = new List<AppointmentServiceItem>
                {
                    new() { Service = _generalExamService, ServiceId = _generalExamService.Id }
                }
            };
            original.Examination!.FollowUpAppointmentId = 888;
            original.Examination.FollowUpDate = oldDate;

            _appointmentRepoMock
                .Setup(r => r.GetByIdWithDetailsAsync(888, It.IsAny<CancellationToken>()))
                .ReturnsAsync(followUpAppointment);

            SetupDoctorShift(newDate, new TimeOnly(8, 0), new TimeOnly(12, 0));

            _appointmentRepoMock
                .Setup(r => r.ExecuteSerializableAsync(It.IsAny<Func<Task<AvailableSlotResponse>>>()))
                .Returns<Func<Task<AvailableSlotResponse>>>(action => action());

            var request = new RescheduleAppointmentRequest
            {
                Date = newDate,
                SlotStart = newSlotStart,
                DoctorId = DoctorId
            };

            var result = await _service.RescheduleAppointmentAsync(888, request, null);

            result.Should().NotBeNull();
            followUpAppointment.AppointmentDate.Should().Be(newDate);
            original.Examination.FollowUpDate.Should().Be(newDate);
        }
    }
}
