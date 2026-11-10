using FluentAssertions;
using Moq;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.UnitTest.Services.Imaging
{
    // Shared mocks, setup and test data for the Imaging tests. Holds no tests itself.
    public abstract class ImagingRequestTestBase
    {
        protected const string DoctorUserId = "doctor-user";
        protected const long ExaminationId = 10;

        protected readonly Mock<IImagingRequestRepository> _imagingRequestRepository = new();
        protected readonly Mock<IStaffRepository> _staffRepository = new();
        protected readonly ImagingRequestService _service;

        protected ImagingRequestTestBase()
        {
            _service = new ImagingRequestService(_imagingRequestRepository.Object, _staffRepository.Object);
        }

        protected static ImagingRequest QueueRequest(
            long id,
            string status,
            DateTimeOffset createdAt,
            string patientName,
            string doctorName)
        {
            return new ImagingRequest
            {
                Id = id,
                ExaminationId = ExaminationId,
                RequestedByDoctorId = 5,
                ImagingType = ImagingRequestConstants.Panoramic,
                TargetArea = "Tooth 36",
                ClinicalIndication = "Check the root",
                RequestStatus = status,
                CreatedAt = createdAt,
                Examination = new Examination
                {
                    Id = ExaminationId,
                    PatientId = 3,
                    Patient = new Patient { Id = 3, FullName = patientName, PatientCode = "BN-03" }
                },
                RequestedByDoctor = new StaffProfile { Id = 5, FullName = doctorName }
            };
        }

        protected void SetupPendingRequest(ImagingRequest? imagingRequest = null)
        {
            _staffRepository
                .Setup(r => r.GetByUserIdAsync(DoctorUserId))
                .ReturnsAsync(new StaffProfile { Id = 5, UserId = DoctorUserId });
            _imagingRequestRepository
                .Setup(r => r.GetTrackedByIdAsync(99, It.IsAny<CancellationToken>()))
                .ReturnsAsync(imagingRequest ?? PendingRequest());
        }

        protected static ImagingRequest PendingRequest()
        {
            return new ImagingRequest
            {
                Id = 99,
                ExaminationId = ExaminationId,
                RequestedByDoctorId = 5,
                ImagingType = ImagingRequestConstants.Panoramic,
                TargetArea = "Tooth 36",
                ClinicalIndication = "Check the root",
                RequestStatus = ImagingRequestConstants.Pending,
                CreatedAt = new DateTimeOffset(2026, 10, 26, 3, 0, 0, TimeSpan.Zero),
                Examination = ExaminationInProgress()
            };
        }

        protected void SetupReadyExamination(Examination? examination = null)
        {
            _staffRepository
                .Setup(r => r.GetByUserIdAsync(DoctorUserId))
                .ReturnsAsync(new StaffProfile { Id = 5, UserId = DoctorUserId });
            _imagingRequestRepository
                .Setup(r => r.GetExaminationAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(examination ?? ExaminationInProgress());
        }

        protected static Examination ExaminationInProgress()
        {
            return new Examination
            {
                Id = ExaminationId,
                DoctorId = 5,
                PatientId = 3,
                ExaminationStatus = ImagingRequestConstants.InProgressExaminationStatus,
                Patient = new Patient { Id = 3, FullName = "Lan Nguyen", PatientCode = "BN-03" }
            };
        }

        protected static CreateImagingRequest ValidRequest(string imagingType = "Panoramic")
        {
            return new CreateImagingRequest
            {
                ImagingType = imagingType,
                TargetArea = "Tooth 36",
                ClinicalIndication = "Check the root"
            };
        }
    }
}
