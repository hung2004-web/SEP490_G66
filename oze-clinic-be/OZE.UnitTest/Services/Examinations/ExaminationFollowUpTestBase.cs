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

namespace OZE.UnitTest.Services.Examinations
{
    // Shared mocks, setup and test data for the Examinations tests. Holds no tests itself.
    public abstract class ExaminationFollowUpTestBase
    {
        protected const int DoctorId = 10;
        protected const string DoctorUserId = "doctor-user-1";
        protected const long ExaminationId = 200;

        protected readonly Mock<IExaminationRepository> _examinationRepoMock = new();
        protected readonly Mock<IStaffRepository> _staffRepoMock = new();
        protected readonly Mock<IAppointmentService> _appointmentServiceMock = new();
        protected readonly Mock<IAuditLogService> _auditLogMock = new();
        protected readonly ExaminationService _service;

        protected ExaminationFollowUpTestBase()
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

        protected Examination CreateTestExamination(int doctorId = DoctorId, string status = ExaminationConstants.InProgress)
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
    }
}
