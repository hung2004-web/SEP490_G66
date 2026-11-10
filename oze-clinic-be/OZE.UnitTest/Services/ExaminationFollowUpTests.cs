using FluentAssertions;
using Moq;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services
{
    public class ExaminationFollowUpTests
    {
        private const int DoctorId = 10;
        private const string DoctorUserId = "doctor-user-1";
        private const long ExaminationId = 200;

        private readonly Mock<IExaminationRepository> _examinationRepoMock = new();
        private readonly Mock<IStaffRepository> _staffRepoMock = new();
        private readonly Mock<IAppointmentService> _appointmentServiceMock = new();
        private readonly Mock<IAuditLogService> _auditLogMock = new();
        private readonly ExaminationService _service;

        public ExaminationFollowUpTests()
        {
            _service = new ExaminationService(
                _examinationRepoMock.Object,
                _staffRepoMock.Object,
                _appointmentServiceMock.Object,
                _auditLogMock.Object);

            _staffRepoMock
                .Setup(r => r.GetByUserIdAsync(DoctorUserId))
                .ReturnsAsync(new StaffProfile { Id = DoctorId, UserId = DoctorUserId });
        }

        private Examination CreateTestExamination(int doctorId = DoctorId, string status = ExaminationConstants.InProgress)
        {
            var patient = new Patient { Id = 5, FullName = "Nguyen Van A", UserId = "patient-user-1", PatientCode = "BN001", PhoneNumber = "0912345678" };
            var doctor = new StaffProfile { Id = doctorId, FullName = "BS. Tran Minh Khoa" };
            var appointment = new Appointment
            {
                Id = 100,
                PatientId = patient.Id,
                DoctorId = doctorId,
                AppointmentDate = DateOnly.FromDateTime(ClinicClock.Today),
                Patient = patient,
                Doctor = doctor,
                ServiceItems = new List<AppointmentServiceItem>()
            };

            return new Examination
            {
                Id = ExaminationId,
                AppointmentId = appointment.Id,
                PatientId = patient.Id,
                DoctorId = doctorId,
                ExaminationStatus = status,
                Appointment = appointment,
                Patient = patient,
                Doctor = doctor,
                Diagnoses = new List<ClinicalDiagnosis>(),
                Prescriptions = new List<Prescription>()
            };
        }

        [Fact]
        public async Task SetFollowUpAsync_ShouldSaveFollowUpDateAndNotes_WhenValid()
        {
            var exam = CreateTestExamination();
            _examinationRepoMock
                .Setup(r => r.GetForWorkAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(exam);
            _examinationRepoMock
                .Setup(r => r.GetEarlierChartEntriesAsync(It.IsAny<int>(), It.IsAny<DateTimeOffset>(), It.IsAny<long>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<DentalChartEntry>());

            var futureDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(7));
            var request = new SaveFollowUpRequest
            {
                FollowUpDate = futureDate,
                FollowUpNotes = "Tái khám kiểm tra tủy sau 7 ngày"
            };

            var result = await _service.SetFollowUpAsync(DoctorUserId, ExaminationId, request);

            result.Should().NotBeNull();
            exam.FollowUpDate.Should().Be(futureDate);
            exam.FollowUpNotes.Should().Be("Tái khám kiểm tra tủy sau 7 ngày");
            _examinationRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
            _auditLogMock.Verify(a => a.LogAsync(
                AuditConstants.ExaminationFollowUpSet,
                AuditConstants.ExaminationEntity,
                ExaminationId.ToString(),
                It.IsAny<object?>(),
                It.IsAny<object?>(),
                It.IsAny<string?>()), Times.Once);
        }

        [Fact]
        public async Task SetFollowUpAsync_ShouldThrowBadRequest_WhenDateIsInPast()
        {
            var exam = CreateTestExamination();
            _examinationRepoMock
                .Setup(r => r.GetForWorkAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(exam);

            var pastDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(-1));
            var request = new SaveFollowUpRequest { FollowUpDate = pastDate };

            var act = () => _service.SetFollowUpAsync(DoctorUserId, ExaminationId, request);

            (await act.Should().ThrowAsync<BadRequestException>())
                .WithMessage(ErrorConstants.ExaminationMessage.FollowUpDateMustBeFuture);
        }

        [Fact]
        public async Task SetFollowUpAsync_ShouldThrowForbidden_WhenNotAssignedDoctor()
        {
            var exam = CreateTestExamination(doctorId: 999);
            _examinationRepoMock
                .Setup(r => r.GetForWorkAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(exam);

            var request = new SaveFollowUpRequest { FollowUpDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(5)) };

            var act = () => _service.SetFollowUpAsync(DoctorUserId, ExaminationId, request);

            await act.Should().ThrowAsync<ForbiddenException>();
        }

        [Fact]
        public async Task SetFollowUpAsync_ShouldThrowBadRequest_WhenExaminationIsLocked()
        {
            var exam = CreateTestExamination(status: ExaminationConstants.Locked);
            _examinationRepoMock
                .Setup(r => r.GetForWorkAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(exam);

            var request = new SaveFollowUpRequest { FollowUpDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(5)) };

            var act = () => _service.SetFollowUpAsync(DoctorUserId, ExaminationId, request);

            (await act.Should().ThrowAsync<BadRequestException>())
                .WithMessage(ErrorConstants.ExaminationMessage.AlreadyLocked);
        }

        [Fact]
        public async Task SetFollowUpAsync_ShouldSucceed_WhenExaminationIsCompleted()
        {
            var exam = CreateTestExamination(status: ExaminationConstants.Completed);
            _examinationRepoMock
                .Setup(r => r.GetForWorkAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(exam);
            _examinationRepoMock
                .Setup(r => r.GetEarlierChartEntriesAsync(It.IsAny<int>(), It.IsAny<DateTimeOffset>(), It.IsAny<long>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<DentalChartEntry>());

            var futureDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(5));
            var request = new SaveFollowUpRequest { FollowUpDate = futureDate, FollowUpNotes = "Tái khám sau điều trị" };

            var result = await _service.SetFollowUpAsync(DoctorUserId, ExaminationId, request);

            result.Should().NotBeNull();
            exam.FollowUpDate.Should().Be(futureDate);
        }

        [Fact]
        public async Task RemindFollowUpAsync_ShouldSendNotificationAndIncrementCount()
        {
            var exam = CreateTestExamination();
            exam.FollowUpDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(3));
            exam.FollowUpNotes = "Tái khám cắt chỉ";

            _examinationRepoMock
                .Setup(r => r.GetByIdWithFollowUpAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(exam);

            Notification? savedNotification = null;
            _examinationRepoMock
                .Setup(r => r.AddNotificationAsync(It.IsAny<Notification>(), It.IsAny<CancellationToken>()))
                .Callback<Notification, CancellationToken>((n, _) => savedNotification = n)
                .Returns(Task.CompletedTask);

            var result = await _service.RemindFollowUpAsync("staff-1", ExaminationId);

            result.Should().NotBeNull();
            result.ReminderCount.Should().Be(1);
            result.LastRemindedAt.Should().NotBeNull();
            exam.FollowUpReminderCount.Should().Be(1);
            savedNotification.Should().NotBeNull();
            savedNotification!.UserId.Should().Be("patient-user-1");
            savedNotification.Message.Should().Contain("Tái khám cắt chỉ");
            _examinationRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task RemindFollowUpAsync_ShouldThrowBadRequest_WhenNoFollowUpSet()
        {
            var exam = CreateTestExamination();
            exam.FollowUpDate = null;
            exam.FollowUpAppointmentId = null;

            _examinationRepoMock
                .Setup(r => r.GetByIdWithFollowUpAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(exam);

            var act = () => _service.RemindFollowUpAsync("staff-1", ExaminationId);

            (await act.Should().ThrowAsync<BadRequestException>())
                .WithMessage(ErrorConstants.ExaminationMessage.FollowUpNotSet);
        }

        [Fact]
        public async Task ScheduleFollowUpAppointmentAsync_ShouldDelegateToAppointmentService()
        {
            var exam = CreateTestExamination();
            _examinationRepoMock
                .Setup(r => r.GetByIdWithFollowUpAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(exam);

            var request = new ScheduleFollowUpRequest
            {
                Date = DateOnly.FromDateTime(ClinicClock.Today.AddDays(7)),
                SlotStart = new TimeOnly(9, 0)
            };

            _appointmentServiceMock
                .Setup(s => s.ScheduleFollowUpAsync(exam.AppointmentId, request, "staff-1", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new AppointmentResponse { Id = 300 });

            var result = await _service.ScheduleFollowUpAppointmentAsync("staff-1", ExaminationId, request);

            result.Should().NotBeNull();
            result.Id.Should().Be(300);
            _appointmentServiceMock.Verify(s => s.ScheduleFollowUpAsync(exam.AppointmentId, request, "staff-1", It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task ScheduleFollowUpAppointmentAsync_ShouldThrowBadRequest_WhenAlreadyScheduled()
        {
            var exam = CreateTestExamination();
            exam.FollowUpAppointmentId = 250;

            _examinationRepoMock
                .Setup(r => r.GetByIdWithFollowUpAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(exam);

            var request = new ScheduleFollowUpRequest
            {
                Date = DateOnly.FromDateTime(ClinicClock.Today.AddDays(7)),
                SlotStart = new TimeOnly(9, 0)
            };

            var act = () => _service.ScheduleFollowUpAppointmentAsync("staff-1", ExaminationId, request);

            (await act.Should().ThrowAsync<BadRequestException>())
                .WithMessage(ErrorConstants.ExaminationMessage.FollowUpAppointmentAlreadyScheduled);
        }

        [Fact]
        public async Task RemindDueFollowUpsAsync_ShouldBatchRemindDuePatients_AndCommitDatabaseOnce()
        {
            var targetDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(1));

            var exam1 = CreateTestExamination();
            exam1.Id = 201;
            exam1.FollowUpDate = targetDate;
            exam1.FollowUpNotes = "Tái khám kiểm tra răng 1";

            var exam2 = CreateTestExamination();
            exam2.Id = 202;
            exam2.FollowUpDate = targetDate;
            exam2.FollowUpNotes = "Tái khám kiểm tra răng 2";

            var dueExams = new List<Examination> { exam1, exam2 };

            _examinationRepoMock
                .Setup(r => r.GetDueFollowUpsAsync(targetDate, It.IsAny<CancellationToken>()))
                .ReturnsAsync(dueExams);

            var savedNotifications = new List<Notification>();
            _examinationRepoMock
                .Setup(r => r.AddNotificationAsync(It.IsAny<Notification>(), It.IsAny<CancellationToken>()))
                .Callback<Notification, CancellationToken>((n, _) => savedNotifications.Add(n))
                .Returns(Task.CompletedTask);

            var result = await _service.RemindDueFollowUpsAsync(targetDate, "System_AutoWorker");

            result.Should().NotBeNull();
            result.TotalTargeted.Should().Be(2);
            result.RemindedCount.Should().Be(2);
            result.FailedCount.Should().Be(0);
            result.RemindedItems.Should().HaveCount(2);

            exam1.FollowUpReminderCount.Should().Be(1);
            exam1.FollowUpRemindedAt.Should().NotBeNull();
            exam2.FollowUpReminderCount.Should().Be(1);
            exam2.FollowUpRemindedAt.Should().NotBeNull();

            savedNotifications.Should().HaveCount(2);
            // Verify single batch save to avoid N+1 database roundtrips
            _examinationRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task RemindDueFollowUpsAsync_ShouldReturnEmpty_WhenNoDuePatients()
        {
            var targetDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(1));

            _examinationRepoMock
                .Setup(r => r.GetDueFollowUpsAsync(targetDate, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Examination>());

            var result = await _service.RemindDueFollowUpsAsync(targetDate, "System_AutoWorker");

            result.Should().NotBeNull();
            result.TotalTargeted.Should().Be(0);
            result.RemindedCount.Should().Be(0);
            result.FailedCount.Should().Be(0);
            result.RemindedItems.Should().BeEmpty();

            _examinationRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task RemindFollowUpAsync_ShouldThrowBadRequest_WhenSentWithinCooldown()
        {
            var exam = CreateTestExamination();
            exam.FollowUpDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(3));
            exam.FollowUpRemindedAt = DateTimeOffset.UtcNow.AddMinutes(-30); // 30 mins ago (< 4 hours)

            _examinationRepoMock
                .Setup(r => r.GetByIdWithFollowUpAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(exam);

            var act = () => _service.RemindFollowUpAsync("staff-1", ExaminationId, force: false);

            await act.Should().ThrowAsync<BadRequestException>()
                .WithMessage("*recently*");
        }

        [Fact]
        public async Task RemindFollowUpAsync_ShouldSucceed_WhenForceIsTrueEvenWithinCooldown()
        {
            var exam = CreateTestExamination();
            exam.FollowUpDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(3));
            exam.FollowUpRemindedAt = DateTimeOffset.UtcNow.AddMinutes(-30);

            _examinationRepoMock
                .Setup(r => r.GetByIdWithFollowUpAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(exam);

            var result = await _service.RemindFollowUpAsync("staff-1", ExaminationId, force: true);

            result.Should().NotBeNull();
            exam.FollowUpReminderCount.Should().Be(1);
        }

        [Fact]
        public async Task GetMyFollowUpsAsync_ShouldReturnPatientFollowUps()
        {
            var patient = new Patient { Id = 5, UserId = "patient-1" };
            var exam = CreateTestExamination();
            exam.FollowUpDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(7));

            _examinationRepoMock
                .Setup(r => r.GetPatientByUserIdAsync("patient-1", It.IsAny<CancellationToken>()))
                .ReturnsAsync(patient);

            _examinationRepoMock
                .Setup(r => r.GetPatientFollowUpsAsync(patient.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Examination> { exam });

            var result = await _service.GetMyFollowUpsAsync("patient-1");

            result.Should().NotBeNull();
            result.Should().HaveCount(1);
            result[0].ExaminationId.Should().Be(exam.Id);
        }
    }
}
