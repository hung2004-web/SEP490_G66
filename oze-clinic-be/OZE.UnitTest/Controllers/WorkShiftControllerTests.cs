using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.ProjectBase.Controllers;
using System;
using System.Threading.Tasks;
using Xunit;

namespace OZE.UnitTest.Controllers
{
    public class WorkShiftControllerTests
    {
        private readonly Mock<IWorkShipService> _workShiftServiceMock;
        private readonly WorkShiftController _controller;

        public WorkShiftControllerTests()
        {
            _workShiftServiceMock = new Mock<IWorkShipService>();
            _controller = new WorkShiftController(_workShiftServiceMock.Object);
        }

        [Fact]
        public async Task CreateWorkShiftAsync_ShouldReturnOk_WhenShiftCreatedSuccessfully()
        {
            // Arrange
            var request = new CreateWorkShiftRequest
            {
                StaffUserId = "staff-user-1",
                ScheduleDate = new DateOnly(2026, 11, 20),
                ShiftStart = new TimeOnly(8, 0),
                ShiftEnd = new TimeOnly(12, 0),
                RoomId = 1,
                Assignment = "Kham tong quat"
            };

            var expectedResponse = new WorkShipResponse
            {
                Id = 100,
                StaffUserId = "staff-user-1",
                StaffName = "Bs. Nguyen Van A",
                RoomId = 1,
                RoomName = "Phong 101",
                ScheduleDate = new DateOnly(2026, 11, 20),
                ShiftStart = new TimeOnly(8, 0),
                ShiftEnd = new TimeOnly(12, 0),
                Assignment = "Kham tong quat",
                CreatedAt = DateTimeOffset.UtcNow
            };

            _workShiftServiceMock
                .Setup(s => s.CreateWorkShipAsync(request))
                .ReturnsAsync(expectedResponse);

            // Act
            var actionResult = await _controller.CreateWorkShiftAsync(request);

            // Assert
            var okResult = actionResult.Result.Should().BeOfType<OkObjectResult>().Subject;
            var response = okResult.Value.Should().BeOfType<ApiResponse<WorkShipResponse>>().Subject;
            response.Success.Should().BeTrue();
            response.Message.Should().Be("Work shift created successfully");
            response.Data.Should().NotBeNull();
            response.Data!.Id.Should().Be(100);
            response.Data.StaffUserId.Should().Be("staff-user-1");

            _workShiftServiceMock.Verify(s => s.CreateWorkShipAsync(request), Times.Once);
        }

        [Fact]
        public async Task CreateWorkShiftAsync_ShouldPropagateException_WhenServiceThrows()
        {
            // Arrange
            var request = new CreateWorkShiftRequest
            {
                StaffUserId = "unknown-user",
                ScheduleDate = new DateOnly(2026, 11, 20),
                ShiftStart = new TimeOnly(8, 0),
                ShiftEnd = new TimeOnly(12, 0)
            };

            _workShiftServiceMock
                .Setup(s => s.CreateWorkShipAsync(request))
                .ThrowsAsync(new NotFoundException(ErrorConstants.WorkShiftMessage.StaffNotFound));

            // Act
            var act = () => _controller.CreateWorkShiftAsync(request);

            // Assert
            var error = await act.Should().ThrowAsync<NotFoundException>();
            error.Which.Message.Should().Be(ErrorConstants.WorkShiftMessage.StaffNotFound);
        }
    }
}
