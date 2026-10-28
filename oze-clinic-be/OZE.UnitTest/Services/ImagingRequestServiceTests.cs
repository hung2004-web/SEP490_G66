using FluentAssertions;
using Moq;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.UnitTest.Services
{
    public class ImagingRequestServiceTests
    {
        private const string DoctorUserId = "doctor-user";
        private const long ExaminationId = 10;

        private readonly Mock<IImagingRequestRepository> _imagingRequestRepository = new();
        private readonly Mock<IStaffRepository> _staffRepository = new();
        private readonly ImagingRequestService _service;

        public ImagingRequestServiceTests()
        {
            _service = new ImagingRequestService(_imagingRequestRepository.Object, _staffRepository.Object);
        }

        [Fact]
        public async Task CreateAsync_ShouldSavePendingRequest_AndNotifyActiveTechnicians()
        {
            var doctor = new StaffProfile { Id = 5, UserId = DoctorUserId, FullName = "Dr An" };
            var examination = ExaminationInProgress();
            ImagingRequest? saved = null;
            IReadOnlyCollection<string>? notifiedUsers = null;
            string? notificationMessage = null;

            _staffRepository.Setup(r => r.GetByUserIdAsync(DoctorUserId)).ReturnsAsync(doctor);
            _imagingRequestRepository
                .Setup(r => r.GetExaminationAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(examination);
            _imagingRequestRepository
                .Setup(r => r.GetActiveTechnicianUserIdsAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<string> { "tech-1", "tech-2" });
            _imagingRequestRepository
                .Setup(r => r.AddAsync(
                    It.IsAny<ImagingRequest>(),
                    It.IsAny<IReadOnlyCollection<string>>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()))
                .Callback<ImagingRequest, IReadOnlyCollection<string>, string, string, CancellationToken>(
                    (request, users, _, message, _) =>
                    {
                        request.Id = 99;
                        saved = request;
                        notifiedUsers = users;
                        notificationMessage = message;
                    })
                .Returns(Task.CompletedTask);

            var result = await _service.CreateAsync(DoctorUserId, ExaminationId, new CreateImagingRequest
            {
                ImagingType = " panoramic ",
                TargetArea = " Tooth 36 ",
                ClinicalIndication = " Check root "
            });

            result.Id.Should().Be(99);
            result.ExaminationId.Should().Be(ExaminationId);
            result.PatientId.Should().Be(examination.PatientId);
            result.ImagingType.Should().Be(ImagingRequestConstants.Panoramic);
            result.TargetArea.Should().Be("Tooth 36");
            result.ClinicalIndication.Should().Be("Check root");
            result.RequestStatus.Should().Be(ImagingRequestConstants.Pending);

            saved.Should().NotBeNull();
            saved!.RequestedByDoctorId.Should().Be(doctor.Id);
            saved.RequestStatus.Should().Be(ImagingRequestConstants.Pending);
            notifiedUsers.Should().BeEquivalentTo(new[] { "tech-1", "tech-2" });
            notificationMessage.Should().Be("Imaging request (Panoramic) for Lan Nguyen has been submitted.");
        }

        [Theory]
        [InlineData(null, "Tooth 36", "Pain", "Please enter imaging type.")]
        [InlineData("   ", "Tooth 36", "Pain", "Please enter imaging type.")]
        [InlineData("Panoramic", null, "Pain", "Please enter target area.")]
        [InlineData("Panoramic", " ", "Pain", "Please enter target area.")]
        [InlineData("Panoramic", "Tooth 36", null, "Please enter clinical indication.")]
        [InlineData("Panoramic", "Tooth 36", "  ", "Please enter clinical indication.")]
        public async Task CreateAsync_ShouldRejectMissingFields(string? imagingType, string? targetArea, string? indication, string expectedMessage)
        {
            SetupReadyExamination();

            var act = () => _service.CreateAsync(DoctorUserId, ExaminationId, new CreateImagingRequest
            {
                ImagingType = imagingType,
                TargetArea = targetArea,
                ClinicalIndication = indication
            });

            var error = await act.Should().ThrowAsync<BadRequestException>();
            error.Which.Message.Should().Be(expectedMessage);
            _imagingRequestRepository.Verify(
                r => r.AddAsync(
                    It.IsAny<ImagingRequest>(),
                    It.IsAny<IReadOnlyCollection<string>>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()),
                Times.Never);
        }

        [Fact]
        public async Task CreateAsync_ShouldRejectImagingTypeOutsideTheAllowedList()
        {
            SetupReadyExamination();

            var act = () => _service.CreateAsync(DoctorUserId, ExaminationId, ValidRequest("MRI"));

            var error = await act.Should().ThrowAsync<BadRequestException>();
            error.Which.Message.Should().Be(ErrorConstants.ImagingRequestMessage.ImagingTypeInvalid);
        }

        [Theory]
        [InlineData("Completed")]
        [InlineData("Locked")]
        public async Task CreateAsync_ShouldRejectExaminationThatIsNotInProgress(string status)
        {
            var examination = ExaminationInProgress();
            examination.ExaminationStatus = status;
            SetupReadyExamination(examination);

            var act = () => _service.CreateAsync(DoctorUserId, ExaminationId, ValidRequest());

            var error = await act.Should().ThrowAsync<BadRequestException>();
            error.Which.Message.Should().Be($"Cannot request imaging because the examination is {status}.");
        }

        [Fact]
        public async Task CreateAsync_ShouldRejectDoctorWhoIsNotExaminingThisVisit()
        {
            var examination = ExaminationInProgress();
            examination.DoctorId = 8;
            SetupReadyExamination(examination);

            var act = () => _service.CreateAsync(DoctorUserId, ExaminationId, ValidRequest());

            var error = await act.Should().ThrowAsync<ForbiddenException>();
            error.Which.Message.Should().Be(ErrorConstants.ImagingRequestMessage.NotExaminingDoctor);
        }

        [Fact]
        public async Task CreateAsync_ShouldReturnNotFound_WhenExaminationDoesNotExist()
        {
            _staffRepository
                .Setup(r => r.GetByUserIdAsync(DoctorUserId))
                .ReturnsAsync(new StaffProfile { Id = 5, UserId = DoctorUserId });
            _imagingRequestRepository
                .Setup(r => r.GetExaminationAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Examination?)null);

            var act = () => _service.CreateAsync(DoctorUserId, ExaminationId, ValidRequest());

            var error = await act.Should().ThrowAsync<NotFoundException>();
            error.Which.Message.Should().Be(ErrorConstants.MedicalRecordMessage.ExaminationNotFound);
        }

        [Fact]
        public async Task CreateAsync_ShouldReturnNotFound_WhenDoctorProfileDoesNotExist()
        {
            _staffRepository
                .Setup(r => r.GetByUserIdAsync(DoctorUserId))
                .ReturnsAsync((StaffProfile?)null);

            var act = () => _service.CreateAsync(DoctorUserId, ExaminationId, ValidRequest());

            var error = await act.Should().ThrowAsync<NotFoundException>();
            error.Which.Message.Should().Be(ErrorConstants.MedicalRecordMessage.DoctorNotFound);
        }

        [Fact]
        public async Task GetByExaminationAsync_ShouldReturnRequestsWithStatus()
        {
            var earlier = new DateTimeOffset(2026, 10, 26, 2, 0, 0, TimeSpan.Zero);
            var later = earlier.AddMinutes(15);
            SetupReadyExamination();
            _imagingRequestRepository
                .Setup(r => r.GetByExaminationIdAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<ImagingRequest>
                {
                    new()
                    {
                        Id = 2,
                        ExaminationId = ExaminationId,
                        ImagingType = ImagingRequestConstants.Cbct,
                        TargetArea = "Full arch",
                        ClinicalIndication = "Implant plan",
                        RequestStatus = ImagingRequestConstants.Pending,
                        CreatedAt = later
                    },
                    new()
                    {
                        Id = 1,
                        ExaminationId = ExaminationId,
                        ImagingType = ImagingRequestConstants.Panoramic,
                        TargetArea = "Tooth 36",
                        ClinicalIndication = "Check the root",
                        RequestStatus = ImagingRequestConstants.Cancelled,
                        CreatedAt = earlier
                    }
                });

            var result = await _service.GetByExaminationAsync(DoctorUserId, ExaminationId);

            result.Should().HaveCount(2);
            result[0].RequestStatus.Should().Be(ImagingRequestConstants.Cancelled);
            result[1].ImagingType.Should().Be(ImagingRequestConstants.Cbct);
            result[1].TargetArea.Should().Be("Full arch");
            result[1].ClinicalIndication.Should().Be("Implant plan");
            result[1].RequestStatus.Should().Be(ImagingRequestConstants.Pending);
            result[1].CreatedAt.Should().Be(later);
            result[1].PatientId.Should().Be(3);
        }

        [Fact]
        public async Task GetByExaminationAsync_ShouldReturnEmptyList_WhenExaminationHasNoRequests()
        {
            var examination = ExaminationInProgress();
            examination.ExaminationStatus = ImagingRequestConstants.Completed;
            SetupReadyExamination(examination);
            _imagingRequestRepository
                .Setup(r => r.GetByExaminationIdAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<ImagingRequest>());

            var result = await _service.GetByExaminationAsync(DoctorUserId, ExaminationId);

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task GetByExaminationAsync_ShouldRejectDoctorWhoIsNotExaminingThisVisit()
        {
            var examination = ExaminationInProgress();
            examination.DoctorId = 8;
            SetupReadyExamination(examination);

            var act = () => _service.GetByExaminationAsync(DoctorUserId, ExaminationId);

            var error = await act.Should().ThrowAsync<ForbiddenException>();
            error.Which.Message.Should().Be(ErrorConstants.ImagingRequestMessage.CannotViewRequests);
        }

        [Fact]
        public async Task GetByExaminationAsync_ShouldReturnNotFound_WhenExaminationDoesNotExist()
        {
            _staffRepository
                .Setup(r => r.GetByUserIdAsync(DoctorUserId))
                .ReturnsAsync(new StaffProfile { Id = 5, UserId = DoctorUserId });
            _imagingRequestRepository
                .Setup(r => r.GetExaminationAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Examination?)null);

            var act = () => _service.GetByExaminationAsync(DoctorUserId, ExaminationId);

            var error = await act.Should().ThrowAsync<NotFoundException>();
            error.Which.Message.Should().Be(ErrorConstants.MedicalRecordMessage.ExaminationNotFound);
        }

        [Fact]
        public async Task GetByIdAsync_ShouldReturnTheRequestCreatedByTheDoctor()
        {
            var createdAt = new DateTimeOffset(2026, 10, 26, 3, 0, 0, TimeSpan.Zero);
            _staffRepository
                .Setup(r => r.GetByUserIdAsync(DoctorUserId))
                .ReturnsAsync(new StaffProfile { Id = 5, UserId = DoctorUserId });
            _imagingRequestRepository
                .Setup(r => r.GetByIdAsync(99, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ImagingRequest
                {
                    Id = 99,
                    ExaminationId = ExaminationId,
                    RequestedByDoctorId = 5,
                    ImagingType = ImagingRequestConstants.PeriapicalXRay,
                    TargetArea = "Tooth 36",
                    ClinicalIndication = "Check the root",
                    RequestStatus = ImagingRequestConstants.Pending,
                    CreatedAt = createdAt,
                    Examination = ExaminationInProgress()
                });

            var result = await _service.GetByIdAsync(DoctorUserId, 99);

            result.Id.Should().Be(99);
            result.ExaminationId.Should().Be(ExaminationId);
            result.PatientId.Should().Be(3);
            result.ImagingType.Should().Be(ImagingRequestConstants.PeriapicalXRay);
            result.TargetArea.Should().Be("Tooth 36");
            result.ClinicalIndication.Should().Be("Check the root");
            result.RequestStatus.Should().Be(ImagingRequestConstants.Pending);
            result.CreatedAt.Should().Be(createdAt);
        }

        [Fact]
        public async Task GetByIdAsync_ShouldReturnNotFound_WhenRequestDoesNotExist()
        {
            _staffRepository
                .Setup(r => r.GetByUserIdAsync(DoctorUserId))
                .ReturnsAsync(new StaffProfile { Id = 5, UserId = DoctorUserId });
            _imagingRequestRepository
                .Setup(r => r.GetByIdAsync(99, It.IsAny<CancellationToken>()))
                .ReturnsAsync((ImagingRequest?)null);

            var act = () => _service.GetByIdAsync(DoctorUserId, 99);

            var error = await act.Should().ThrowAsync<NotFoundException>();
            error.Which.Message.Should().Be(ErrorConstants.ImagingRequestMessage.RequestNotFound);
        }

        [Fact]
        public async Task GetByIdAsync_ShouldRejectDoctorWhoDidNotCreateTheRequest()
        {
            _staffRepository
                .Setup(r => r.GetByUserIdAsync(DoctorUserId))
                .ReturnsAsync(new StaffProfile { Id = 5, UserId = DoctorUserId });
            _imagingRequestRepository
                .Setup(r => r.GetByIdAsync(99, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ImagingRequest
                {
                    Id = 99,
                    RequestedByDoctorId = 8,
                    Examination = ExaminationInProgress()
                });

            var act = () => _service.GetByIdAsync(DoctorUserId, 99);

            var error = await act.Should().ThrowAsync<ForbiddenException>();
            error.Which.Message.Should().Be(ErrorConstants.ImagingRequestMessage.CannotViewRequest);
        }

        private void SetupReadyExamination(Examination? examination = null)
        {
            _staffRepository
                .Setup(r => r.GetByUserIdAsync(DoctorUserId))
                .ReturnsAsync(new StaffProfile { Id = 5, UserId = DoctorUserId });
            _imagingRequestRepository
                .Setup(r => r.GetExaminationAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(examination ?? ExaminationInProgress());
        }

        private static Examination ExaminationInProgress()
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

        private static CreateImagingRequest ValidRequest(string imagingType = "Panoramic")
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
