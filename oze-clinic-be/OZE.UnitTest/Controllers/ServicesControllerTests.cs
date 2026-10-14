using Microsoft.AspNetCore.Mvc;
using Moq;
using OZE.Application.Interfaces;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Controllers;
using Xunit;

namespace OZE.UnitTest.Controllers
{
    public class ServicesControllerTests
    {
        private readonly Mock<IClinicServiceService> _clinicServiceMock;
        private readonly ServicesController _controller;

        public ServicesControllerTests()
        {
            _clinicServiceMock = new Mock<IClinicServiceService>();
            _controller = new ServicesController(_clinicServiceMock.Object);
        }

        [Fact]
        public async Task GetServicesAsync_ShouldReturnOk_WhenServicesExist()
        {
            // Arrange
            var query = new ServiceQueryParameters
            {
                PageNumber = 1,
                PageSize = 10,
                IsActive = true
            };

            var sampleServices = new List<ServiceDto>
            {
                new()
                {
                    Id = 1,
                    ServiceCode = "DV-001",
                    ServiceName = "Lấy cao răng",
                    ReferencePrice = 200000m,
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow
                }
            };

            var pagedResult = new PagedResult<ServiceDto>(sampleServices, totalCount: 1, pageNumber: 1, pageSize: 10);
            var expectedResponse = ApiResponse<PagedResult<ServiceDto>>.SuccessResult(pagedResult);

            _clinicServiceMock
                .Setup(s => s.GetServicesAsync(query, It.IsAny<CancellationToken>()))
                .ReturnsAsync(expectedResponse);

            // Act
            var actionResult = await _controller.GetServicesAsync(query, CancellationToken.None);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var response = Assert.IsType<ApiResponse<PagedResult<ServiceDto>>>(okResult.Value);
            Assert.True(response.Success);
            Assert.NotNull(response.Data);
            Assert.Single(response.Data.Items);
            Assert.Equal("DV-001", response.Data.Items[0].ServiceCode);
        }

        [Fact]
        public async Task CreateServiceAsync_ShouldReturnCreatedAtAction_WhenValidRequest()
        {
            // Arrange
            var request = new CreateServiceRequest
            {
                ServiceCode = "DV-002",
                ServiceName = "Tẩy trắng răng",
                ReferencePrice = 1500000m,
                EstimatedMinutes = 60,
                RequiredRoomType = "Treatment",
                IsActive = true
            };

            var createdDto = new ServiceDto
            {
                Id = 2,
                ServiceCode = "DV-002",
                ServiceName = "Tẩy trắng răng",
                ReferencePrice = 1500000m,
                EstimatedMinutes = 60,
                RequiredRoomType = "Treatment",
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            };

            var expectedResponse = ApiResponse<ServiceDto>.SuccessResult(createdDto, "Service created successfully");

            _clinicServiceMock
                .Setup(s => s.CreateServiceAsync(request, It.IsAny<CancellationToken>()))
                .ReturnsAsync(expectedResponse);

            // Act
            var actionResult = await _controller.CreateServiceAsync(request, CancellationToken.None);

            // Assert
            var createdAtActionResult = Assert.IsType<CreatedAtActionResult>(actionResult.Result);
            Assert.Equal(nameof(ServicesController.GetServiceByIdAsync), createdAtActionResult.ActionName);
            var response = Assert.IsType<ApiResponse<ServiceDto>>(createdAtActionResult.Value);
            Assert.True(response.Success);
            Assert.NotNull(response.Data);
            Assert.Equal(2, response.Data.Id);
            Assert.Equal("DV-002", response.Data.ServiceCode);
        }
    }
}
