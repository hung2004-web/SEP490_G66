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
    public class HomeControllerTests
    {
        private readonly Mock<IHomeService> _homeServiceMock;
        private readonly HomeController _controller;

        public HomeControllerTests()
        {
            _homeServiceMock = new Mock<IHomeService>();
            _controller = new HomeController(_homeServiceMock.Object);
        }

        [Fact]
        public async Task GetHomeAsync_ShouldReturnOk_WithHomePageData()
        {
            // Arrange (3.2 View Home Page)
            var sampleHomeData = new HomePageResponse
            {
                Doctors = new List<HomeDoctorResponse>
                {
                    new() { Id = 1, FullName = "Dr. Nguyễn Văn A", Specialization = "Orthodontics", LicenseNumber = "BS-12345" }
                },
                Services = new List<HomeServiceResponse>
                {
                    new() { Id = 101, ServiceName = "Niềng răng", ReferencePrice = 25000000m, EstimatedMinutes = 60 }
                }
            };

            _homeServiceMock
                .Setup(s => s.GetHomePageAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(sampleHomeData);

            // Act
            var actionResult = await _controller.GetHomeAsync(CancellationToken.None);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var response = Assert.IsType<ApiResponse<HomePageResponse>>(okResult.Value);
            Assert.True(response.Success);
            Assert.NotNull(response.Data);
            Assert.Single(response.Data.Doctors);
            Assert.Single(response.Data.Services);
            Assert.Equal("Dr. Nguyễn Văn A", response.Data.Doctors[0].FullName);
            Assert.Equal("Niềng răng", response.Data.Services[0].ServiceName);
        }

        [Fact]
        public async Task GetDoctorsAsync_ShouldReturnOk_WhenDoctorsExist()
        {
            // Arrange (3.3 View Doctor Information)
            var query = new DoctorQueryParameters
            {
                SearchKeyword = "Nguyen",
                PageNumber = 1,
                PageSize = 10
            };

            var sampleDoctors = new List<HomeDoctorResponse>
            {
                new() { Id = 1, FullName = "Dr. Nguyễn Văn A", Specialization = "Orthodontics", LicenseNumber = "BS-12345" }
            };
            var pagedResult = new PagedResult<HomeDoctorResponse>(sampleDoctors, totalCount: 1, pageNumber: 1, pageSize: 10);

            _homeServiceMock
                .Setup(s => s.GetDoctorsAsync(query, It.IsAny<CancellationToken>()))
                .ReturnsAsync(pagedResult);

            // Act
            var actionResult = await _controller.GetDoctorsAsync(query, CancellationToken.None);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var response = Assert.IsType<ApiResponse<PagedResult<HomeDoctorResponse>>>(okResult.Value);
            Assert.True(response.Success);
            Assert.NotNull(response.Data);
            Assert.Single(response.Data.Items);
            Assert.Equal("Dr. Nguyễn Văn A", response.Data.Items[0].FullName);
        }

        [Fact]
        public async Task GetDoctorsAsync_ShouldReturnNoDataMessage_WhenNoDoctorsMatch()
        {
            // Arrange (BR-112, MSG02: "No Data.")
            var query = new DoctorQueryParameters
            {
                SearchKeyword = "NonExistent",
                PageNumber = 1,
                PageSize = 10
            };

            var pagedResult = new PagedResult<HomeDoctorResponse>(new List<HomeDoctorResponse>(), totalCount: 0, pageNumber: 1, pageSize: 10);

            _homeServiceMock
                .Setup(s => s.GetDoctorsAsync(query, It.IsAny<CancellationToken>()))
                .ReturnsAsync(pagedResult);

            // Act
            var actionResult = await _controller.GetDoctorsAsync(query, CancellationToken.None);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var response = Assert.IsType<ApiResponse<PagedResult<HomeDoctorResponse>>>(okResult.Value);
            Assert.True(response.Success);
            Assert.NotNull(response.Data);
            Assert.Empty(response.Data.Items);
            Assert.Equal(ErrorConstants.Common.NoData, response.Message);
        }

        [Fact]
        public async Task GetDoctorByIdAsync_ShouldReturnOk_WhenDoctorExists()
        {
            // Arrange
            var doctorId = 1;
            var sampleDoctor = new HomeDoctorResponse
            {
                Id = doctorId,
                FullName = "Dr. Nguyễn Văn A",
                Specialization = "Orthodontics",
                LicenseNumber = "BS-12345"
            };

            _homeServiceMock
                .Setup(s => s.GetDoctorByIdAsync(doctorId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(sampleDoctor);

            // Act
            var actionResult = await _controller.GetDoctorByIdAsync(doctorId, CancellationToken.None);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var response = Assert.IsType<ApiResponse<HomeDoctorResponse>>(okResult.Value);
            Assert.True(response.Success);
            Assert.NotNull(response.Data);
            Assert.Equal(doctorId, response.Data.Id);
            Assert.Equal("Dr. Nguyễn Văn A", response.Data.FullName);
        }

        [Fact]
        public async Task GetDoctorByIdAsync_ShouldReturnNotFound_WhenDoctorDoesNotExist()
        {
            // Arrange
            var doctorId = 999;

            _homeServiceMock
                .Setup(s => s.GetDoctorByIdAsync(doctorId, It.IsAny<CancellationToken>()))
                .ReturnsAsync((HomeDoctorResponse?)null);

            // Act
            var actionResult = await _controller.GetDoctorByIdAsync(doctorId, CancellationToken.None);

            // Assert
            var notFoundResult = Assert.IsType<NotFoundObjectResult>(actionResult.Result);
            var response = Assert.IsType<ApiResponse<HomeDoctorResponse>>(notFoundResult.Value);
            Assert.False(response.Success);
            Assert.Equal("Doctor not found.", response.Message);
        }
    }
}
