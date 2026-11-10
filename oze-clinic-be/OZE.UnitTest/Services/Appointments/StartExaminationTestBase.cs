using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.Appointments
{
    // Start examination: the assigned doctor, a checked-in appointment, one examination, status IN_SERVICE
    // Shared mocks, setup and test data for the Appointments tests. Holds no tests itself.
    public abstract class StartExaminationTestBase
    {
        protected const int DoctorId = 7;
        protected const string DoctorUserId = "doctor-user-1";

        protected readonly Mock<IAppointmentRepository> _appointmentRepositoryMock = new();
        protected readonly Mock<IAuditLogService> _auditLogServiceMock = new();
        protected readonly AppointmentService _service;

        protected StartExaminationTestBase()
        {
            _service = new AppointmentService(
                _appointmentRepositoryMock.Object,
                new Mock<IRegistrationRepository>().Object,
                new Mock<IServiceRepository>().Object,
                new Mock<ISmsSender>().Object,
                new Mock<IEmailSender>().Object,
                _auditLogServiceMock.Object,
                new Mock<ILogger<AppointmentService>>().Object);

            _appointmentRepositoryMock
                .Setup(r => r.GetStaffProfileIdByUserIdAsync(DoctorUserId))
                .ReturnsAsync(DoctorId);
            _appointmentRepositoryMock
                .Setup(r => r.SaveStartedExaminationAsync(It.IsAny<Appointment>(), It.IsAny<Examination>(), It.IsAny<CancellationToken>()))
                .Callback<Appointment, Examination, CancellationToken>((_, examination, _) => examination.Id = 55)
                .Returns(Task.CompletedTask);
        }

        protected void ArrangeAppointment(string status, int? doctorId = DoctorId, DateOnly? date = null, string? notes = null)
        {
            var appointment = new Appointment
            {
                Id = 100,
                PatientId = 20,
                DoctorId = doctorId,
                Status = status,
                AppointmentDate = date ?? DateOnly.FromDateTime(DateTime.Today),
                Notes = notes,
                Patient = new Patient { FullName = "Tran Thi B" }
            };
            _appointmentRepositoryMock
                .Setup(r => r.GetByIdWithDetailsAsync(100, It.IsAny<CancellationToken>()))
                .ReturnsAsync(appointment);
        }
    }
}
