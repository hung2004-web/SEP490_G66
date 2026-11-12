using FluentAssertions;
using Moq;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.Appointments
{
    // OZ-APPT-22 BookByReceptionist (lễ tân đặt lịch hộ, F-APT-09)
    [Trait("Tab", "OZ-APPT-22")]
    public class BookByReceptionistTests : AppointmentQueueTestBase
    {
        private static ReceptionBookingRequest Request(int? patientId = null, string? name = null, string? phone = null) => new()
        {
            PatientId = patientId,
            FullName = name,
            PhoneNumber = phone,
            Date = Today.AddDays(1),
            SlotStart = new TimeOnly(9, 0)
        };

        // UTCID01 (A): a patient record that does not exist
        [Fact]
        public async Task UnknownPatient_Throws()
        {
            _appointmentRepoMock.Setup(r => r.GetPatientByIdAsync(99)).ReturnsAsync((Patient?)null);

            var act = () => _service.BookByReceptionistAsync(Request(patientId: 99), "lt");

            await act.Should().ThrowAsync<NotFoundException>().WithMessage(ErrorConstants.AppointmentMessage.PatientProfileNotFound);
        }

        // UTCID02 (A): a new patient needs a name
        [Fact]
        public async Task NewPatient_WithoutName_Throws()
        {
            var act = () => _service.BookByReceptionistAsync(Request(phone: "0912345678"), "lt");

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.AuthMessage.FullNameRequired);
        }

        // UTCID03 (A): a new patient needs a valid phone
        [Fact]
        public async Task NewPatient_BadPhone_Throws()
        {
            var act = () => _service.BookByReceptionistAsync(Request(name: "Nguyen Van A", phone: "123"), "lt");

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.AuthMessage.InvalidPhone);
        }
    }
}
