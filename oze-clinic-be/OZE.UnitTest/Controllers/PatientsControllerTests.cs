using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Controllers;
using Xunit;

namespace OZE.UnitTest.Controllers
{
    public class PatientsControllerTests
    {
        private readonly Mock<IPatientService> _patientServiceMock;
        private readonly PatientsController _controller;

        public PatientsControllerTests()
        {
            _patientServiceMock = new Mock<IPatientService>();
            _controller = new PatientsController(_patientServiceMock.Object);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "user-test-id"),
                new Claim(ClaimTypes.Role, RoleConstants.ReceptionistRole)
            }, "TestAuth"));

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
        }

        [Fact]
        public async Task GetPatientsAsync_ShouldReturnOk_WhenCalled()
        {
            // Arrange
            var query = new PatientQueryParameters { PageNumber = 1, PageSize = 10 };
            var pagedResult = new PagedResult<PatientDto>(new List<PatientDto>
            {
                new() { Id = 1, FullName = "Nguyen Van A", PatientCode = "BN-261021-123456" }
            }, 1, 1, 10);

            _patientServiceMock
                .Setup(s => s.GetPatientsAsync(query, It.IsAny<CancellationToken>()))
                .ReturnsAsync(ApiResponse<PagedResult<PatientDto>>.SuccessResult(pagedResult));

            // Act
            var actionResult = await _controller.GetPatientsAsync(query, CancellationToken.None);

            // Assert
            var okResult = actionResult.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            var response = okResult!.Value as ApiResponse<PagedResult<PatientDto>>;
            response.Should().NotBeNull();
            response!.Success.Should().BeTrue();
            response.Data!.Items.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetPatientByIdAsync_ShouldReturnOk_WhenPatientExists()
        {
            // Arrange
            var patientDetail = new PatientDetailDto
            {
                Id = 1,
                PatientCode = "BN-261021-123456",
                FullName = "Nguyen Van A"
            };

            _patientServiceMock
                .Setup(s => s.GetPatientByIdAsync(1, It.IsAny<CancellationToken>()))
                .ReturnsAsync(ApiResponse<PatientDetailDto>.SuccessResult(patientDetail));

            // Act
            var actionResult = await _controller.GetPatientByIdAsync(1, CancellationToken.None);

            // Assert
            var okResult = actionResult.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            var response = okResult!.Value as ApiResponse<PatientDetailDto>;
            response!.Success.Should().BeTrue();
            response.Data!.Id.Should().Be(1);
        }

        [Fact]
        public async Task GetPatientByIdAsync_ShouldReturnNotFound_WhenPatientDoesNotExist()
        {
            // Arrange
            _patientServiceMock
                .Setup(s => s.GetPatientByIdAsync(999, It.IsAny<CancellationToken>()))
                .ReturnsAsync(ApiResponse<PatientDetailDto>.FailureResult(ErrorConstants.PatientMessage.PatientNotFound));

            // Act
            var actionResult = await _controller.GetPatientByIdAsync(999, CancellationToken.None);

            // Assert
            var notFoundResult = actionResult.Result as NotFoundObjectResult;
            notFoundResult.Should().NotBeNull();
        }

        [Fact]
        public async Task CreatePatientAsync_ShouldReturnCreatedAtAction_WhenValidRequest()
        {
            // Arrange
            var request = new CreatePatientRequest
            {
                FullName = "Tran Thi B",
                PhoneNumber = "0987654321",
                Gender = "Female"
            };

            var createdPatient = new PatientDto
            {
                Id = 2,
                PatientCode = "BN-261021-654321",
                FullName = "Tran Thi B"
            };

            _patientServiceMock
                .Setup(s => s.CreatePatientAsync(request, It.IsAny<CancellationToken>()))
                .ReturnsAsync(ApiResponse<PatientDto>.SuccessResult(createdPatient, "Patient created successfully"));

            // Act
            var actionResult = await _controller.CreatePatientAsync(request, CancellationToken.None);

            // Assert
            var createdResult = actionResult.Result as CreatedAtActionResult;
            createdResult.Should().NotBeNull();
            createdResult!.ActionName.Should().Be(nameof(PatientsController.GetPatientByIdAsync));
            var response = createdResult.Value as ApiResponse<PatientDto>;
            response!.Success.Should().BeTrue();
            response.Data!.Id.Should().Be(2);
        }

        [Fact]
        public async Task CreatePatientAsync_ShouldReturnBadRequest_WhenInvalid()
        {
            // Arrange
            var request = new CreatePatientRequest { FullName = "" };

            _patientServiceMock
                .Setup(s => s.CreatePatientAsync(request, It.IsAny<CancellationToken>()))
                .ReturnsAsync(ApiResponse<PatientDto>.FailureResult("FullName is required."));

            // Act
            var actionResult = await _controller.CreatePatientAsync(request, CancellationToken.None);

            // Assert
            var badRequestResult = actionResult.Result as BadRequestObjectResult;
            badRequestResult.Should().NotBeNull();
        }

        [Fact]
        public async Task UpdatePatientAsync_ShouldReturnOk_WhenSuccessful()
        {
            // Arrange
            var request = new UpdatePatientRequest { FullName = "Nguyen Van A Updated" };
            var updatedPatient = new PatientDto { Id = 1, FullName = "Nguyen Van A Updated" };

            _patientServiceMock
                .Setup(s => s.UpdatePatientAsync(1, request, It.IsAny<CancellationToken>()))
                .ReturnsAsync(ApiResponse<PatientDto>.SuccessResult(updatedPatient, "Patient updated successfully"));

            // Act
            var actionResult = await _controller.UpdatePatientAsync(1, request, CancellationToken.None);

            // Assert
            var okResult = actionResult.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            var response = okResult!.Value as ApiResponse<PatientDto>;
            response!.Success.Should().BeTrue();
            response.Data!.FullName.Should().Be("Nguyen Van A Updated");
        }

        [Fact]
        public async Task DeletePatientAsync_ShouldReturnOk_WhenDeleted()
        {
            // Arrange
            _patientServiceMock
                .Setup(s => s.DeletePatientAsync(1, It.IsAny<CancellationToken>()))
                .ReturnsAsync(ApiResponse<bool>.SuccessResult(true, "Patient deleted successfully"));

            // Act
            var actionResult = await _controller.DeletePatientAsync(1, CancellationToken.None);

            // Assert
            var okResult = actionResult.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            var response = okResult!.Value as ApiResponse<bool>;
            response!.Success.Should().BeTrue();
            response.Data.Should().BeTrue();
        }

        [Fact]
        public async Task AddMedicalProfileAsync_ShouldReturnOk_WhenAdded()
        {
            // Arrange
            var request = new CreateMedicalProfileRequest
            {
                RecordType = "Allergy",
                Title = "Di ung Penicillin",
                Severity = "Severe"
            };

            var profileDto = new PatientMedicalProfileDto
            {
                Id = 10,
                PatientId = 1,
                RecordType = "Allergy",
                Title = "Di ung Penicillin"
            };

            _patientServiceMock
                .Setup(s => s.AddMedicalProfileAsync(1, request, "user-test-id", It.IsAny<CancellationToken>()))
                .ReturnsAsync(ApiResponse<PatientMedicalProfileDto>.SuccessResult(profileDto, "Medical profile added successfully"));

            // Act
            var actionResult = await _controller.AddMedicalProfileAsync(1, request, CancellationToken.None);

            // Assert
            var okResult = actionResult.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            var response = okResult!.Value as ApiResponse<PatientMedicalProfileDto>;
            response!.Success.Should().BeTrue();
            response.Data!.Title.Should().Be("Di ung Penicillin");
        }
    }
}
