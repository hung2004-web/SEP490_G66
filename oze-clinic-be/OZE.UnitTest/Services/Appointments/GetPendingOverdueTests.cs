using FluentAssertions;
using Moq;
using OZE.Application.Helpers;
using OZE.Common.Constants;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.Appointments
{
    // OZ-APT-10 PENDING appointments past their confirmation deadline (F-APT-10)
    [Trait("Tab", "OZ-APT-10")]
    public class GetPendingOverdueTests : AppointmentFollowUpTestBase
    {
        public GetPendingOverdueTests()
        {
            _appointmentRepoMock
                .Setup(r => r.GetConfigValueAsync(ConfigKeyConstants.BookingPendingConfirmHours))
                .ReturnsAsync("4");
            _appointmentRepoMock
                .Setup(r => r.GetConfigValueAsync(ConfigKeyConstants.BookingPendingVisitSoonHours))
                .ReturnsAsync("24");
        }

        // A PENDING appointment booked `bookedHoursAgo` ago whose visit starts `visitInHours` from now
        private Appointment Pending(long id, double bookedHoursAgo, double visitInHours, double? rescheduledHoursAgo = null)
        {
            var visit = ClinicClock.Now.AddHours(visitInHours);
            return new Appointment
            {
                Id = id,
                PatientId = _patient.Id,
                Patient = _patient,
                DoctorId = DoctorId,
                Doctor = new StaffProfile { Id = DoctorId, FullName = "BS. Le Thu Ha" },
                Status = AppointmentConstants.PendingStatus,
                AppointmentDate = DateOnly.FromDateTime(visit),
                TimeSlotStart = TimeOnly.FromDateTime(visit),
                CreatedAt = DateTimeOffset.UtcNow.AddHours(-bookedHoursAgo),
                UpdatedAt = rescheduledHoursAgo.HasValue ? DateTimeOffset.UtcNow.AddHours(-rescheduledHoursAgo.Value) : null
            };
        }

        private void Returns(params Appointment[] appointments)
        {
            _appointmentRepoMock
                .Setup(r => r.GetPendingFromAsync(It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(appointments.ToList());
        }

        [Fact]
        public async Task GetPendingOverdueAsync_ShouldSkip_WhenJustBookedAndVisitFarAway()
        {
            Returns(Pending(1, bookedHoursAgo: 1, visitInHours: 72));

            var result = await _service.GetPendingOverdueAsync();

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task GetPendingOverdueAsync_ShouldFlagWaitingTooLong_WhenPendingOverConfirmHours()
        {
            Returns(Pending(2, bookedHoursAgo: 5, visitInHours: 72));

            var result = await _service.GetPendingOverdueAsync();

            result.Should().ContainSingle();
            result[0].Reason.Should().Be(AppointmentConstants.PendingWaitingTooLong);
            result[0].PendingHours.Should().Be(5);
            result[0].PatientPhoneNumber.Should().Be(_patient.PhoneNumber);
        }

        [Fact]
        public async Task GetPendingOverdueAsync_ShouldFlagVisitSoon_EvenWhenJustBooked()
        {
            Returns(Pending(3, bookedHoursAgo: 0.5, visitInHours: 10));

            var result = await _service.GetPendingOverdueAsync();

            result.Should().ContainSingle();
            result[0].Reason.Should().Be(AppointmentConstants.PendingVisitSoon);
            result[0].ConfirmDeadline.Should().BeBefore(ClinicClock.Now);
        }

        [Fact]
        public async Task GetPendingOverdueAsync_ShouldCountFromReschedule_WhenPatientRescheduled()
        {
            // Booked long ago, but moved by the patient an hour ago: the wait starts again
            Returns(Pending(4, bookedHoursAgo: 48, visitInHours: 72, rescheduledHoursAgo: 1));

            var result = await _service.GetPendingOverdueAsync();

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task GetPendingOverdueAsync_ShouldPutVisitSoonFirst()
        {
            Returns(Pending(5, bookedHoursAgo: 10, visitInHours: 72), Pending(6, bookedHoursAgo: 1, visitInHours: 5));

            var result = await _service.GetPendingOverdueAsync();

            result.Select(x => x.AppointmentId).Should().Equal(6, 5);
        }

        [Fact]
        public async Task GetPendingOverdueAsync_ShouldOnlyAskForPendingFromToday()
        {
            Returns();

            await _service.GetPendingOverdueAsync();

            _appointmentRepoMock.Verify(r => r.GetPendingFromAsync(DateOnly.FromDateTime(ClinicClock.Today), It.IsAny<CancellationToken>()), Times.Once);
        }
    }
}
