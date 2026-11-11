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
    // Shared mocks, setup and test data for the Appointments tests. Holds no tests itself.
    public abstract class AppointmentFollowUpTestBase
    {
        protected const int DoctorId = 5;
        protected const int RoomId = 1;
        protected const long OriginalAppointmentId = 100;
        protected const long OriginalExaminationId = 200;

        protected readonly Mock<IAppointmentRepository> _appointmentRepoMock = new();
        protected readonly Mock<IRegistrationRepository> _registrationRepoMock = new();
        protected readonly Mock<IServiceRepository> _serviceRepoMock = new();
        protected readonly Mock<ISmsSender> _smsSenderMock = new();
        protected readonly Mock<IEmailSender> _emailSenderMock = new();
        protected readonly Mock<IAuditLogService> _auditLogMock = new();
        protected readonly Mock<ILogger<AppointmentService>> _loggerMock = new();
        protected readonly AppointmentService _service;

        protected readonly Service _generalExamService;
        protected readonly Patient _patient;

        protected AppointmentFollowUpTestBase()
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

        protected Appointment CreateOriginalAppointment(string status = AppointmentConstants.CompletedStatus)
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

        protected void SetupDoctorShift(DateOnly date, TimeOnly shiftStart, TimeOnly shiftEnd)
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
    }
}
