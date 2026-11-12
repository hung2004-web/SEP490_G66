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
    public class DoctorsControllerTests
    {
        private readonly Mock<IHomeService> _homeServiceMock;
        private readonly DoctorsController _controller;

        public DoctorsControllerTests()
        {
            _homeServiceMock = new Mock<IHomeService>();
            _controller = new DoctorsController(_homeServiceMock.Object);
        }

        [Fact]
        public async Task GetDoctorsAsync_ShouldReturnOk_WhenDoctorsExist()
        {
            // Arrange
            var query = new DoctorQueryParameters
            {
                SearchKeyword = "Tran",
                PageNumber = 1,
                PageSize = 10
            };

            var sampleDoctors = new List<HomeDoctorResponse>
            {
                new() { Id = 2, FullName = "Dr. Trần Thị B", Specialization = "Implantology", LicenseNumber = "BS-67890" }
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
            Assert.Equal("Dr. Trần Thị B", response.Data.Items[0].FullName);
        }

        [Fact]
        public async Task GetDoctorsAsync_ShouldReturnNoData_WhenNoneFound()
        {
            // Arrange
            var query = new DoctorQueryParameters { PageNumber = 1, PageSize = 10 };
            var pagedResult = new PagedResult<HomeDoctorResponse>(new List<HomeDoctorResponse>(), 0, 1, 10);

            _homeServiceMock
                .Setup(s => s.GetDoctorsAsync(query, It.IsAny<CancellationToken>()))
                .ReturnsAsync(pagedResult);

            // Act
            var actionResult = await _controller.GetDoctorsAsync(query, CancellationToken.None);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var response = Assert.IsType<ApiResponse<PagedResult<HomeDoctorResponse>>>(okResult.Value);
            Assert.True(response.Success);
            Assert.Equal(ErrorConstants.Common.NoData, response.Message);
        }

        [Fact]
        public async Task GetDoctorByIdAsync_ShouldReturnDoctor_WhenFound()
        {
            // Arrange
            var doctorId = 2;
            var sampleDoctor = new HomeDoctorResponse
            {
                Id = doctorId,
                FullName = "Dr. Trần Thị B",
                Specialization = "Implantology"
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
            Assert.Equal("Dr. Trần Thị B", response.Data!.FullName);
        }

        [Fact]
        public async Task GetDoctorByIdAsync_ShouldReturnNotFound_WhenNotFound()
        {
            // Arrange
            var doctorId = 404;

            _homeServiceMock
                .Setup(s => s.GetDoctorByIdAsync(doctorId, It.IsAny<CancellationToken>()))
                .ReturnsAsync((HomeDoctorResponse?)null);

            // Act
            var actionResult = await _controller.GetDoctorByIdAsync(doctorId, CancellationToken.None);

            // Assert
            var notFoundResult = Assert.IsType<NotFoundObjectResult>(actionResult.Result);
            var response = Assert.IsType<ApiResponse<HomeDoctorResponse>>(notFoundResult.Value);
            Assert.False(response.Success);
        }
    }
}
