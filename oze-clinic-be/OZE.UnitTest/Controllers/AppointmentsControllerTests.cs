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
    public class AppointmentsControllerTests
    {
        private readonly Mock<IAppointmentService> _appointmentServiceMock;
        private readonly AppointmentsController _controller;

        public AppointmentsControllerTests()
        {
            _appointmentServiceMock = new Mock<IAppointmentService>();
            _controller = new AppointmentsController(_appointmentServiceMock.Object);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "staff-user-123"),
                new Claim(ClaimTypes.Role, RoleConstants.ReceptionistRole)
            }, "TestAuth"));

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
        }

        [Fact]
        public async Task GetAppointmentsAsync_ShouldReturnOk_WithPagedList()
        {
            // Arrange
            var query = new AppointmentQueryParameters { PageNumber = 1, PageSize = 10, Date = new DateOnly(2026, 10, 27) };
            var pagedResult = new PagedResult<AppointmentResponse>(new List<AppointmentResponse>
            {
                new()
                {
                    Id = 1,
                    PatientId = 10,
                    PatientName = "Nguyen Van A",
                    PatientCode = "BN-261027-000001",
                    Status = AppointmentConstants.ConfirmedStatus,
                    AppointmentDate = new DateOnly(2026, 10, 27),
                    TimeSlotStart = new TimeOnly(9, 0),
                    TimeSlotEnd = new TimeOnly(9, 30)
                }
            }, 1, 1, 10);

            _appointmentServiceMock
                .Setup(s => s.GetAppointmentsAsync(query, It.IsAny<CancellationToken>()))
                .ReturnsAsync(pagedResult);

            // Act
            var actionResult = await _controller.GetAppointmentsAsync(query, CancellationToken.None);

            // Assert
            var okResult = actionResult.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            var response = okResult!.Value as ApiResponse<PagedResult<AppointmentResponse>>;
            response.Should().NotBeNull();
            response!.Success.Should().BeTrue();
            response.Data!.Items.Should().HaveCount(1);
            response.Data.Items[0].PatientName.Should().Be("Nguyen Van A");
        }

        [Fact]
        public async Task GetAppointmentByIdAsync_ShouldReturnOk_WhenFound()
        {
            // Arrange
            var appointment = new AppointmentResponse
            {
                Id = 100,
                PatientId = 10,
                PatientName = "Tran Thi B",
                DoctorName = "Dr. Le Van C",
                Status = AppointmentConstants.ConfirmedStatus,
                AppointmentDate = new DateOnly(2026, 10, 27)
            };

            _appointmentServiceMock
                .Setup(s => s.GetAppointmentByIdAsync(100, It.IsAny<CancellationToken>()))
                .ReturnsAsync(appointment);

            // Act
            var actionResult = await _controller.GetAppointmentByIdAsync(100, CancellationToken.None);

            // Assert
            var okResult = actionResult.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            var response = okResult!.Value as ApiResponse<AppointmentResponse>;
            response.Should().NotBeNull();
            response!.Success.Should().BeTrue();
            response.Data!.Id.Should().Be(100);
            response.Data.PatientName.Should().Be("Tran Thi B");
        }

        [Fact]
        public async Task CancelAppointmentAsync_ShouldReturnOk_WhenCancelled()
        {
            // Arrange
            var request = new CancelAppointmentRequest { Reason = "Khách bận đột xuất" };
            var cancelled = new AppointmentResponse
            {
                Id = 100,
                Status = AppointmentConstants.CancelledStatus,
                CancellationReason = "Khách bận đột xuất"
            };

            _appointmentServiceMock
                .Setup(s => s.CancelAppointmentAsync(100, request, "staff-user-123", It.IsAny<CancellationToken>()))
                .ReturnsAsync(cancelled);

            // Act
            var actionResult = await _controller.CancelAppointmentAsync(100, request, CancellationToken.None);

            // Assert
            var okResult = actionResult.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            var response = okResult!.Value as ApiResponse<AppointmentResponse>;
            response.Should().NotBeNull();
            response!.Success.Should().BeTrue();
            response.Data!.Status.Should().Be(AppointmentConstants.CancelledStatus);
            response.Data.CancellationReason.Should().Be("Khách bận đột xuất");
        }

        [Fact]
        public async Task CheckInAppointmentAsync_ShouldReturnOk_WhenCheckedIn()
        {
            // Arrange
            var checkedIn = new AppointmentResponse
            {
                Id = 100,
                Status = AppointmentConstants.CheckedInStatus,
                CheckInAt = DateTimeOffset.UtcNow
            };

            _appointmentServiceMock
                .Setup(s => s.CheckInAppointmentAsync(100, It.IsAny<CancellationToken>()))
                .ReturnsAsync(checkedIn);

            // Act
            var actionResult = await _controller.CheckInAppointmentAsync(100, CancellationToken.None);

            // Assert
            var okResult = actionResult.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            var response = okResult!.Value as ApiResponse<AppointmentResponse>;
            response.Should().NotBeNull();
            response!.Success.Should().BeTrue();
            response.Data!.Status.Should().Be(AppointmentConstants.CheckedInStatus);
            response.Data.CheckInAt.Should().NotBeNull();
        }
    }
}
