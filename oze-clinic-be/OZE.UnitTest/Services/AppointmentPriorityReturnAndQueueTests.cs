using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
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

namespace OZE.UnitTest.Services
{
    public class AppointmentPriorityReturnAndQueueTests
    {
        private const int DoctorId = 10;
        private const string DoctorUserId = "doc-user-10";
        private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

        private readonly Mock<IAppointmentRepository> _appointmentRepoMock = new();
        private readonly Mock<IAuditLogService> _auditLogMock = new();
        private readonly Mock<IQueueService> _queueServiceMock = new();
        private readonly AppointmentService _service;

        public AppointmentPriorityReturnAndQueueTests()
        {
            _service = new AppointmentService(
                _appointmentRepoMock.Object,
                new Mock<IRegistrationRepository>().Object,
                new Mock<IServiceRepository>().Object,
                new Mock<ISmsSender>().Object,
                new Mock<IEmailSender>().Object,
                _auditLogMock.Object,
                new Mock<ILogger<AppointmentService>>().Object,
                _queueServiceMock.Object);

            _appointmentRepoMock
                .Setup(r => r.GetConfigValueAsync(ConfigKeyConstants.CheckInLateMinutes))
                .ReturnsAsync("15");

            _appointmentRepoMock
                .Setup(r => r.GetStaffProfileIdByUserIdAsync(DoctorUserId))
                .ReturnsAsync(DoctorId);
        }

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

        [Fact]
        public async Task StartExaminationAsync_ShouldResumeExistingExamination_WhenReturningFromImaging()
        {
            // Arrange
            var existingExam = new Examination
            {
                Id = 77,
                AppointmentId = 200,
                PatientId = 55,
                DoctorId = DoctorId,
                ExaminationStatus = ExaminationConstants.InProgress,
                ChiefComplaint = "Toothache"
            };

            var appointment = new Appointment
            {
                Id = 200,
                PatientId = 55,
                DoctorId = DoctorId,
                Status = AppointmentConstants.CheckedInStatus,
                AppointmentDate = Today,
                Examination = existingExam
            };

            _appointmentRepoMock
                .Setup(r => r.GetByIdWithExaminationAsync(200, It.IsAny<CancellationToken>()))
                .ReturnsAsync(appointment);

            _appointmentRepoMock
                .Setup(r => r.HasAppointmentInServiceAsync(DoctorId, Today))
                .ReturnsAsync(false);

            // Act
            var response = await _service.StartExaminationAsync(200, DoctorUserId);

            // Assert
            response.ExaminationId.Should().Be(77);
            appointment.Status.Should().Be(AppointmentConstants.InServiceStatus);

            _appointmentRepoMock.Verify(r => r.UpdateAsync(appointment), Times.Once);
            _queueServiceMock.Verify(q => q.UpdateStatusAsync(200, "Examination", "IN_PROGRESS", It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task CompleteExaminationAsync_ShouldLockExaminationAndCompleteAppointment()
        {
            // Arrange
            var examination = new Examination
            {
                Id = 88,
                AppointmentId = 300,
                PatientId = 66,
                DoctorId = DoctorId,
                ExaminationStatus = ExaminationConstants.InProgress
            };

            var appointment = new Appointment
            {
                Id = 300,
                PatientId = 66,
                DoctorId = DoctorId,
                Status = AppointmentConstants.InServiceStatus,
                AppointmentDate = Today,
                Examination = examination
            };

            _appointmentRepoMock
                .Setup(r => r.GetByIdWithExaminationAsync(300, It.IsAny<CancellationToken>()))
                .ReturnsAsync(appointment);

            // Act
            var response = await _service.CompleteExaminationAsync(300, DoctorUserId);

            // Assert
            response.Status.Should().Be(AppointmentConstants.CompletedStatus);
            examination.ExaminationStatus.Should().Be("Locked");
            examination.LockedByUserId.Should().Be(DoctorUserId);

            _appointmentRepoMock.Verify(r => r.UpdateAsync(appointment), Times.Once);
            _queueServiceMock.Verify(q => q.UpdateStatusAsync(300, "Examination", "COMPLETED", It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task CompleteExaminationAsync_ShouldReject_WhenAppointmentIsNotInService()
        {
            // Arrange
            var appointment = new Appointment
            {
                Id = 300,
                DoctorId = DoctorId,
                Status = AppointmentConstants.CheckedInStatus
            };

            _appointmentRepoMock
                .Setup(r => r.GetByIdWithExaminationAsync(300, It.IsAny<CancellationToken>()))
                .ReturnsAsync(appointment);

            // Act
            var act = () => _service.CompleteExaminationAsync(300, DoctorUserId);

            // Assert
            await act.Should().ThrowAsync<BadRequestException>()
                .WithMessage(ErrorConstants.AppointmentMessage.OnlyInServiceCanBeCompleted);
        }

        [Fact]
        public async Task CompleteExaminationAsync_ShouldReject_WhenDoctorIsNotAssigned()
        {
            // Arrange
            var appointment = new Appointment
            {
                Id = 300,
                DoctorId = 999, // different doctor
                Status = AppointmentConstants.InServiceStatus
            };

            _appointmentRepoMock
                .Setup(r => r.GetByIdWithExaminationAsync(300, It.IsAny<CancellationToken>()))
                .ReturnsAsync(appointment);

            // Act
            var act = () => _service.CompleteExaminationAsync(300, DoctorUserId);

            // Assert
            await act.Should().ThrowAsync<NotFoundException>()
                .WithMessage(ErrorConstants.AppointmentMessage.AppointmentNotFound);
        }

        [Fact]
        public async Task QueueService_ShouldEnqueueAndCallNext()
        {
            // Arrange
            var queueRepoMock = new Mock<IQueueRepository>();
            var loggerMock = new Mock<ILogger<QueueService>>();
            var queueService = new QueueService(queueRepoMock.Object, loggerMock.Object);

            // The repository gives the number together with saving
            queueRepoMock
                .Setup(r => r.AddWithNextNumberAsync(It.IsAny<QueueEntry>(), It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((QueueEntry e, DateOnly _, CancellationToken _) =>
                {
                    e.QueueNumber = 5;
                    return e;
                });

            queueRepoMock
                .Setup(r => r.TryMarkCalledAsync(It.IsAny<long>(), It.IsAny<int?>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

            // Act: Enqueue
            var entry = await queueService.EnqueueAsync(100, "Examination", roomId: 1, assignedStaffId: DoctorId, priority: 1);

            // Assert
            entry.QueueNumber.Should().Be(5);
            entry.Status.Should().Be("WAITING");

            // Arrange: CallNext
            queueRepoMock
                .Setup(r => r.GetActiveEntriesAsync("Examination", 1, null, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<QueueEntry> { entry });

            // Act: CallNext
            var called = await queueService.CallNextAsync("Examination", roomId: 1);

            // Assert
            called.Should().NotBeNull();
            called!.Status.Should().Be("CALLED");
            called.CalledAt.Should().NotBeNull();
        }
    }
}
