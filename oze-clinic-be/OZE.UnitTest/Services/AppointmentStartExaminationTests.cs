using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services
{
    // Start examination: the assigned doctor, a checked-in appointment, one examination, status IN_SERVICE
    public class AppointmentStartExaminationTests
    {
        private const int DoctorId = 7;
        private const string DoctorUserId = "doctor-user-1";

        private readonly Mock<IAppointmentRepository> _appointmentRepositoryMock = new();
        private readonly Mock<IAuditLogService> _auditLogServiceMock = new();
        private readonly AppointmentService _service;

        public AppointmentStartExaminationTests()
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

        private void ArrangeAppointment(string status, int? doctorId = DoctorId)
        {
            var appointment = new Appointment
            {
                Id = 100,
                PatientId = 20,
                DoctorId = doctorId,
                Status = status,
                Patient = new Patient { FullName = "Tran Thi B" }
            };
            _appointmentRepositoryMock
                .Setup(r => r.GetByIdWithDetailsAsync(100, It.IsAny<CancellationToken>()))
                .ReturnsAsync(appointment);
        }

        [Fact]
        public async Task StartExaminationAsync_ShouldCreateOneExamination_WhenCheckedInForThisDoctor()
        {
            ArrangeAppointment(AppointmentConstants.CheckedInStatus);
            Examination? saved = null;
            _appointmentRepositoryMock
                .Setup(r => r.SaveStartedExaminationAsync(It.IsAny<Appointment>(), It.IsAny<Examination>(), It.IsAny<CancellationToken>()))
                .Callback<Appointment, Examination, CancellationToken>((appointment, examination, _) =>
                {
                    saved = examination;
                    examination.Id = 55;
                    appointment.Status.Should().Be(AppointmentConstants.InServiceStatus);
                })
                .Returns(Task.CompletedTask);

            var result = await _service.StartExaminationAsync(100, DoctorUserId);

            result.ExaminationId.Should().Be(55);
            result.AppointmentId.Should().Be(100);
            result.PatientId.Should().Be(20);
            result.DoctorId.Should().Be(DoctorId);
            result.ExaminationStatus.Should().Be(ExaminationConstants.InProgress);
            result.AppointmentStatus.Should().Be(AppointmentConstants.InServiceStatus);
            saved.Should().NotBeNull();
            saved!.PatientId.Should().Be(20);
            saved.DoctorId.Should().Be(DoctorId);
            saved.ExaminationStatus.Should().Be(ExaminationConstants.InProgress);
            _appointmentRepositoryMock.Verify(
                r => r.SaveStartedExaminationAsync(It.IsAny<Appointment>(), It.IsAny<Examination>(), It.IsAny<CancellationToken>()),
                Times.Once);
            _auditLogServiceMock.Verify(a => a.LogAsync(AuditConstants.AppointmentExaminationStarted, AuditConstants.AppointmentEntity,
                "100", It.IsAny<object?>(), It.IsAny<object?>(), It.IsAny<string?>()), Times.Once);
        }

        [Theory]
        [InlineData(AppointmentConstants.PendingStatus)]
        [InlineData(AppointmentConstants.ConfirmedStatus)]
        [InlineData(AppointmentConstants.InServiceStatus)]
        [InlineData(AppointmentConstants.CompletedStatus)]
        [InlineData(AppointmentConstants.CancelledStatus)]
        [InlineData(AppointmentConstants.NoShowStatus)]
        public async Task StartExaminationAsync_ShouldReject_WhenNotCheckedIn(string status)
        {
            ArrangeAppointment(status);

            var act = () => _service.StartExaminationAsync(100, DoctorUserId);

            (await act.Should().ThrowAsync<BadRequestException>())
                .WithMessage(ErrorConstants.AppointmentMessage.OnlyCheckedInCanBeStarted);
            _appointmentRepositoryMock.Verify(
                r => r.SaveStartedExaminationAsync(It.IsAny<Appointment>(), It.IsAny<Examination>(), It.IsAny<CancellationToken>()),
                Times.Never);
        }

        [Fact]
        public async Task StartExaminationAsync_ShouldReject_WhenTheDoctorIsNotAssigned()
        {
            ArrangeAppointment(AppointmentConstants.CheckedInStatus, doctorId: 8);

            var act = () => _service.StartExaminationAsync(100, DoctorUserId);

            (await act.Should().ThrowAsync<ForbiddenException>())
                .WithMessage(ErrorConstants.AppointmentMessage.NotAssignedDoctor);
            _appointmentRepositoryMock.Verify(
                r => r.SaveStartedExaminationAsync(It.IsAny<Appointment>(), It.IsAny<Examination>(), It.IsAny<CancellationToken>()),
                Times.Never);
        }

        [Fact]
        public async Task StartExaminationAsync_ShouldReturnNotFound_WhenAppointmentDoesNotExist()
        {
            _appointmentRepositoryMock
                .Setup(r => r.GetByIdWithDetailsAsync(100, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Appointment?)null);

            var act = () => _service.StartExaminationAsync(100, DoctorUserId);

            await act.Should().ThrowAsync<NotFoundException>();
        }

        [Fact]
        public async Task StartExaminationAsync_ShouldReturnNotFound_WhenTheAccountHasNoDoctorProfile()
        {
            _appointmentRepositoryMock
                .Setup(r => r.GetStaffProfileIdByUserIdAsync(DoctorUserId))
                .ReturnsAsync((int?)null);

            var act = () => _service.StartExaminationAsync(100, DoctorUserId);

            (await act.Should().ThrowAsync<NotFoundException>())
                .WithMessage(ErrorConstants.AppointmentMessage.DoctorProfileNotFound);
            _appointmentRepositoryMock.Verify(
                r => r.GetByIdWithDetailsAsync(It.IsAny<long>(), It.IsAny<CancellationToken>()),
                Times.Never);
        }
    }
}
