using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Threading;
using System;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.Appointments
{
    // OZ-APPT-09 GetWaitingList
    [Trait("Tab", "OZ-APPT-09")]
    public class GetWaitingListTests : AppointmentQueueTestBase
    {
        [Fact]
        public async Task GetWaitingListAsync_ShouldPlacePriorityReturnPatientAheadOfOnTimePatients()
        {
            // Arrange:
            // Patient 1: Booked on-time patient
            var onTimePatient = new Appointment
            {
                Id = 1,
                PatientId = 101,
                Patient = new Patient { FullName = "Nguyen Van A" },
                DoctorId = DoctorId,
                AppointmentType = AppointmentConstants.BookedType,
                AppointmentDate = Today,
                TimeSlotStart = new TimeOnly(8, 0),
                Status = AppointmentConstants.CheckedInStatus,
                Priority = PriorityConstants.Normal,
                CheckInAt = DateTimeOffset.UtcNow.AddMinutes(-30)
            };

            // Patient 2: Returning patient from X-ray (has Examination record)
            var returnPatient = new Appointment
            {
                Id = 2,
                PatientId = 102,
                Patient = new Patient { FullName = "Tran Thi Return" },
                DoctorId = DoctorId,
                AppointmentType = AppointmentConstants.BookedType,
                AppointmentDate = Today,
                TimeSlotStart = new TimeOnly(8, 30),
                Status = AppointmentConstants.CheckedInStatus,
                Priority = PriorityConstants.Normal,
                CheckInAt = DateTimeOffset.UtcNow.AddMinutes(-20),
                Examination = new Examination
                {
                    Id = 50,
                    AppointmentId = 2,
                    PatientId = 102,
                    DoctorId = DoctorId,
                    ExaminationStatus = ExaminationConstants.InProgress
                }
            };

            _appointmentRepoMock
                .Setup(r => r.GetWaitingAppointmentsAsync(Today, null, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Appointment> { onTimePatient, returnPatient });

            // Act
            var result = await _service.GetWaitingListAsync(null, null);

            // Assert:
            result.Should().HaveCount(2);
            result[0].AppointmentId.Should().Be(2);
            result[0].IsPriorityReturn.Should().BeTrue();
            result[0].Position.Should().Be(1);

            result[1].AppointmentId.Should().Be(1);
            result[1].IsPriorityReturn.Should().BeFalse();
            result[1].Position.Should().Be(2);
        }
    }
}
