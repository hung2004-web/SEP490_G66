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

namespace OZE.UnitTest.Services
{
    public class AppointmentFollowUpTests
    {
        private const int DoctorId = 5;
        private const int RoomId = 1;
        private const long OriginalAppointmentId = 100;
        private const long OriginalExaminationId = 200;

        private readonly Mock<IAppointmentRepository> _appointmentRepoMock = new();
        private readonly Mock<IRegistrationRepository> _registrationRepoMock = new();
        private readonly Mock<IServiceRepository> _serviceRepoMock = new();
        private readonly Mock<ISmsSender> _smsSenderMock = new();
        private readonly Mock<IEmailSender> _emailSenderMock = new();
        private readonly Mock<IAuditLogService> _auditLogMock = new();
        private readonly Mock<ILogger<AppointmentService>> _loggerMock = new();
        private readonly AppointmentService _service;

        private readonly Service _generalExamService;
        private readonly Patient _patient;

        public AppointmentFollowUpTests()
        {
            _generalExamService = new Service
            {
                Id = 1,
                ServiceCode = "KHAM-TQ",
                ServiceName = "Kham tong quat",
                ReferencePrice = 0,
                EstimatedMinutes = 30,
                IsActive = true
            };

            _patient = new Patient
            {
                Id = 15,
                FullName = "Tran Van C",
                PatientCode = "BN000015",
                PhoneNumber = "0987654321",
                UserId = "user-patient-15"
            };

            _service = new AppointmentService(
                _appointmentRepoMock.Object,
                _registrationRepoMock.Object,
                _serviceRepoMock.Object,
                _smsSenderMock.Object,
                _emailSenderMock.Object,
                _auditLogMock.Object,
                _loggerMock.Object);

            // Repository default setups
            _appointmentRepoMock
                .Setup(r => r.GetConfigValueAsync(ConfigKeyConstants.GeneralExamServiceCode))
                .ReturnsAsync("KHAM-TQ");
            _appointmentRepoMock
                .Setup(r => r.GetConfigValueAsync(ConfigKeyConstants.SlotDurationMinutes))
                .ReturnsAsync("30");
            _appointmentRepoMock
                .Setup(r => r.GetConfigValueAsync(ConfigKeyConstants.BookingMaxDaysAhead))
                .ReturnsAsync("30");
            _appointmentRepoMock
                .Setup(r => r.GetConfigValueAsync(ConfigKeyConstants.BookingMinHoursAhead))
                .ReturnsAsync("0");

            _serviceRepoMock
                .Setup(r => r.GetByCodeAsync("KHAM-TQ", It.IsAny<CancellationToken>()))
                .ReturnsAsync(_generalExamService);

            _appointmentRepoMock
                .Setup(r => r.GetServicesByIdsAsync(It.IsAny<IReadOnlyCollection<int>>()))
                .ReturnsAsync(new List<Service>());
            _appointmentRepoMock
                .Setup(r => r.GetVariantsByIdsAsync(It.IsAny<IReadOnlyCollection<int>>()))
                .ReturnsAsync(new List<ServiceVariant>());

            _appointmentRepoMock
                .Setup(r => r.ExecuteSerializableAsync(It.IsAny<Func<Task<(Appointment, Patient, AvailableSlotResponse)>>>()))
                .Returns<Func<Task<(Appointment, Patient, AvailableSlotResponse)>>>(action => action());
        }

        private Appointment CreateOriginalAppointment(string status = AppointmentConstants.CompletedStatus)
        {
            var today = DateOnly.FromDateTime(ClinicClock.Today);
            var doctor = new StaffProfile { Id = DoctorId, FullName = "BS. Le Thu Ha" };

            var exam = new Examination
            {
                Id = OriginalExaminationId,
                AppointmentId = OriginalAppointmentId,
                PatientId = _patient.Id,
                DoctorId = DoctorId,
                ExaminationStatus = ExaminationConstants.Locked,
                Patient = _patient,
                Doctor = doctor
            };

            var appointment = new Appointment
            {
                Id = OriginalAppointmentId,
                PatientId = _patient.Id,
                DoctorId = DoctorId,
                AppointmentDate = today,
                TimeSlotStart = new TimeOnly(8, 0),
                TimeSlotEnd = new TimeOnly(8, 30),
                Status = status,
                Patient = _patient,
                Doctor = doctor,
                Examination = exam,
                ServiceItems = new List<AppointmentServiceItem>()
            };

            exam.Appointment = appointment;
            return appointment;
        }

        private void SetupDoctorShift(DateOnly date, TimeOnly shiftStart, TimeOnly shiftEnd)
        {
            var room = new Room { Id = RoomId, RoomName = "Phong kham 1", RoomType = RoomTypeConstants.GeneralTreatment };
            var shift = new StaffSchedule
            {
                Id = 1,
                StaffProfileId = DoctorId,
                ScheduleDate = date,
                ShiftStart = shiftStart,
                ShiftEnd = shiftEnd,
                Room = room,
                RoomId = RoomId,
                StaffProfile = new StaffProfile { Id = DoctorId, FullName = "BS. Le Thu Ha" }
            };

            _appointmentRepoMock
                .Setup(r => r.GetDoctorShiftsAsync(date, DoctorId))
                .ReturnsAsync(new List<StaffSchedule> { shift });
            _appointmentRepoMock
                .Setup(r => r.GetActiveAppointmentsAsync(date, It.IsAny<IReadOnlyCollection<int>>()))
                .ReturnsAsync(new List<Appointment>());
            _appointmentRepoMock
                .Setup(r => r.HasEndedShiftAsync(DoctorId, date))
                .ReturnsAsync(false);
        }

        [Fact]
        public async Task ScheduleFollowUpAsync_ShouldCreateAppointmentAndLinkToExamination()
        {
            var original = CreateOriginalAppointment();
            var followUpDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(7));
            var slotStart = new TimeOnly(9, 0);

            _appointmentRepoMock
                .Setup(r => r.GetByIdWithExaminationAsync(OriginalAppointmentId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(original);

            SetupDoctorShift(followUpDate, new TimeOnly(8, 0), new TimeOnly(12, 0));

            Appointment? createdAppointment = null;
            _appointmentRepoMock
                .Setup(r => r.AddAsync(It.IsAny<Appointment>()))
                .Callback<Appointment>(a =>
                {
                    a.Id = 500;
                    createdAppointment = a;
                })
                .Returns(Task.CompletedTask);

            Notification? createdNotification = null;
            _appointmentRepoMock
                .Setup(r => r.AddNotificationAsync(It.IsAny<Notification>(), It.IsAny<CancellationToken>()))
                .Callback<Notification, CancellationToken>((n, _) => createdNotification = n)
                .Returns(Task.CompletedTask);

            var request = new ScheduleFollowUpRequest
            {
                Date = followUpDate,
                SlotStart = slotStart,
                Notes = "Tái khám theo hẹn"
            };

            var result = await _service.ScheduleFollowUpAsync(OriginalAppointmentId, request, "receptionist-user-1");

            result.Should().NotBeNull();
            createdAppointment.Should().NotBeNull();
            createdAppointment!.ParentAppointmentId.Should().Be(OriginalAppointmentId);
            createdAppointment.AppointmentDate.Should().Be(followUpDate);
            createdAppointment.TimeSlotStart.Should().Be(slotStart);
            createdAppointment.Status.Should().Be(AppointmentConstants.ConfirmedStatus);

            original.Examination!.FollowUpAppointmentId.Should().Be(500);
            original.Examination.FollowUpDate.Should().Be(followUpDate);
            original.Examination.FollowUpNotes.Should().Be("Tái khám theo hẹn");

            createdNotification.Should().NotBeNull();
            createdNotification!.UserId.Should().Be("user-patient-15");

            _auditLogMock.Verify(a => a.LogAsync(
                AuditConstants.AppointmentFollowUpScheduled,
                AuditConstants.AppointmentEntity,
                "500",
                It.IsAny<object?>(),
                It.IsAny<object?>(),
                It.IsAny<string?>()), Times.Once);
        }

        [Fact]
        public async Task ScheduleFollowUpAsync_ShouldThrowBadRequest_WhenDateIsNotAfterOriginal()
        {
            var original = CreateOriginalAppointment();
            _appointmentRepoMock
                .Setup(r => r.GetByIdWithExaminationAsync(OriginalAppointmentId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(original);

            var request = new ScheduleFollowUpRequest
            {
                Date = original.AppointmentDate, // Same day
                SlotStart = new TimeOnly(14, 0)
            };

            var act = () => _service.ScheduleFollowUpAsync(OriginalAppointmentId, request, "staff-1");

            (await act.Should().ThrowAsync<BadRequestException>())
                .WithMessage(ErrorConstants.ExaminationMessage.FollowUpDateMustBeFuture);
        }

        [Fact]
        public async Task ScheduleFollowUpAsync_ShouldThrowBadRequest_WhenAlreadyScheduled()
        {
            var original = CreateOriginalAppointment();
            original.Examination!.FollowUpAppointmentId = 999;

            _appointmentRepoMock
                .Setup(r => r.GetByIdWithExaminationAsync(OriginalAppointmentId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(original);

            var request = new ScheduleFollowUpRequest
            {
                Date = DateOnly.FromDateTime(ClinicClock.Today.AddDays(7)),
                SlotStart = new TimeOnly(9, 0)
            };

            var act = () => _service.ScheduleFollowUpAsync(OriginalAppointmentId, request, "staff-1");

            (await act.Should().ThrowAsync<BadRequestException>())
                .WithMessage(ErrorConstants.AppointmentMessage.FollowUpAlreadyScheduled);
        }

        [Fact]
        public async Task ScheduleFollowUpAsync_ShouldAllowScheduling_WhenCurrentAppointmentIsInService()
        {
            // The appointment is currently IN_SERVICE today (doctor is examining the patient right now)
            var original = CreateOriginalAppointment(status: AppointmentConstants.InServiceStatus);
            var followUpDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(5));
            var slotStart = new TimeOnly(10, 0);

            _appointmentRepoMock
                .Setup(r => r.GetByIdWithExaminationAsync(OriginalAppointmentId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(original);

            SetupDoctorShift(followUpDate, new TimeOnly(8, 0), new TimeOnly(12, 0));

            // HasUnfinishedAppointmentAsync passes excludeAppointmentId = original.Id, returning false
            _appointmentRepoMock
                .Setup(r => r.HasUnfinishedAppointmentAsync(_patient.Id, OriginalAppointmentId))
                .ReturnsAsync(false);

            Appointment? createdAppointment = null;
            _appointmentRepoMock
                .Setup(r => r.AddAsync(It.IsAny<Appointment>()))
                .Callback<Appointment>(a =>
                {
                    a.Id = 501;
                    createdAppointment = a;
                })
                .Returns(Task.CompletedTask);

            var request = new ScheduleFollowUpRequest
            {
                Date = followUpDate,
                SlotStart = slotStart,
                Notes = "Tái khám sau trám tủy"
            };

            var result = await _service.ScheduleFollowUpAsync(OriginalAppointmentId, request, "doctor-user-1");

            result.Should().NotBeNull();
            createdAppointment.Should().NotBeNull();
            createdAppointment!.ParentAppointmentId.Should().Be(OriginalAppointmentId);
        }

        [Fact]
        public async Task ScheduleFollowUpAsync_ShouldAllowScheduling_WhenPreviousFollowUpWasCancelled()
        {
            var original = CreateOriginalAppointment();
            var cancelledFollowUp = new Appointment
            {
                Id = 999,
                Status = AppointmentConstants.CancelledStatus,
                AppointmentDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(2))
            };
            original.Examination!.FollowUpAppointmentId = 999;
            original.Examination.FollowUpAppointment = cancelledFollowUp;

            var newFollowUpDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(8));
            var slotStart = new TimeOnly(10, 0);

            _appointmentRepoMock
                .Setup(r => r.GetByIdWithExaminationAsync(OriginalAppointmentId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(original);

            SetupDoctorShift(newFollowUpDate, new TimeOnly(8, 0), new TimeOnly(12, 0));

            _appointmentRepoMock
                .Setup(r => r.HasUnfinishedAppointmentAsync(_patient.Id, OriginalAppointmentId))
                .ReturnsAsync(false);

            Appointment? createdAppointment = null;
            _appointmentRepoMock
                .Setup(r => r.AddAsync(It.IsAny<Appointment>()))
                .Callback<Appointment>(a =>
                {
                    a.Id = 502;
                    createdAppointment = a;
                })
                .Returns(Task.CompletedTask);

            var request = new ScheduleFollowUpRequest
            {
                Date = newFollowUpDate,
                SlotStart = slotStart,
                Notes = "Đặt lại lịch tái khám sau khi đã hủy lần trước"
            };

            var result = await _service.ScheduleFollowUpAsync(OriginalAppointmentId, request, "receptionist-1");

            result.Should().NotBeNull();
            createdAppointment.Should().NotBeNull();
            original.Examination.FollowUpAppointmentId.Should().Be(502);
            original.Examination.FollowUpDate.Should().Be(newFollowUpDate);
        }

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
