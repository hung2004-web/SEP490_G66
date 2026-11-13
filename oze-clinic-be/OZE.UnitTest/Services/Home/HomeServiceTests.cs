using Moq;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.Home
{
    public class HomeServiceTests
    {
        private readonly Mock<IHomeRepository> _repoMock;
        private readonly HomeService _service;

        public HomeServiceTests()
        {
            _repoMock = new Mock<IHomeRepository>();
            _service = new HomeService(_repoMock.Object);
        }

        [Fact]
        public async Task GetHomePageAsync_ShouldReturnActiveServicesAndDoctors()
        {
            // Arrange
            var sampleServices = new List<Service>
            {
                new()
                {
                    Id = 1,
                    ServiceCode = "DV-001",
                    ServiceName = "Lấy cao răng",
                    Description = "Vệ sinh răng miệng",
                    ReferencePrice = 200000m,
                    EstimatedMinutes = 30,
                    IsActive = true
                }
            };

            var sampleDoctors = new List<StaffProfile>
            {
                new()
                {
                    Id = 10,
                    FullName = "BS. Nguyễn Văn A",
                    Specialization = "Răng hàm mặt",
                    LicenseNumber = "CCHN-001",
                    PhoneNumber = "0987654321",
                    IsActive = true
                }
            };

            _repoMock
                .Setup(r => r.GetActiveServiceAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(sampleServices);

            _repoMock
                .Setup(r => r.GetActiveDoctorAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(sampleDoctors);

            // Act
            var result = await _service.GetHomePageAsync(CancellationToken.None);

            // Assert
            Assert.NotNull(result);
            Assert.Single(result.Services);
            Assert.Single(result.Doctors);
            Assert.Equal("Lấy cao răng", result.Services[0].ServiceName);
            Assert.Equal(200000m, result.Services[0].ReferencePrice);
            Assert.Equal("BS. Nguyễn Văn A", result.Doctors[0].FullName);
            Assert.Equal("CCHN-001", result.Doctors[0].LicenseNumber);
        }

        [Fact]
        public async Task GetDoctorsAsync_ShouldReturnPagedMappedDoctors()
        {
            // Arrange
            var parameters = new DoctorQueryParameters
            {
                SearchKeyword = "Nguyen",
                PageNumber = 1,
                PageSize = 5
            };

            var pagedProfiles = new PagedResult<StaffProfile>(
                new List<StaffProfile>
                {
                    new()
                    {
                        Id = 1,
                        FullName = "BS. Nguyễn Văn A",
                        Specialization = "Nha khoa tổng quát",
                        LicenseNumber = "CCHN-12345",
                        PhoneNumber = "0901234567"
                    }
                },
                totalCount: 1,
                pageNumber: 1,
                pageSize: 5
            );

            _repoMock
                .Setup(r => r.GetActiveDoctorsPagedAsync(parameters, It.IsAny<CancellationToken>()))
                .ReturnsAsync(pagedProfiles);

            // Act
            var result = await _service.GetDoctorsAsync(parameters, CancellationToken.None);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(1, result.TotalCount);
            Assert.Single(result.Items);
            Assert.Equal("BS. Nguyễn Văn A", result.Items[0].FullName);
            Assert.Equal("CCHN-12345", result.Items[0].LicenseNumber);
        }

        [Fact]
        public async Task GetDoctorByIdAsync_ShouldReturnMappedDoctor_WhenFound()
        {
            // Arrange
            var doctorId = 5;
            var profile = new StaffProfile
            {
                Id = doctorId,
                FullName = "BS. Phạm Văn Hùng",
                Specialization = "Chỉnh nha",
                LicenseNumber = "BS-8888",
                PhoneNumber = "0911223344"
            };

            _repoMock
                .Setup(r => r.GetActiveDoctorByIdAsync(doctorId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(profile);

            // Act
            var result = await _service.GetDoctorByIdAsync(doctorId, CancellationToken.None);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(doctorId, result.Id);
            Assert.Equal("BS. Phạm Văn Hùng", result.FullName);
            Assert.Equal("Chỉnh nha", result.Specialization);
            Assert.Equal("BS-8888", result.LicenseNumber);
        }

        [Fact]
        public async Task GetDoctorByIdAsync_ShouldReturnNull_WhenNotFound()
        {
            // Arrange
            var doctorId = 999;
            _repoMock
                .Setup(r => r.GetActiveDoctorByIdAsync(doctorId, It.IsAny<CancellationToken>()))
                .ReturnsAsync((StaffProfile?)null);

            // Act
            var result = await _service.GetDoctorByIdAsync(doctorId, CancellationToken.None);

            // Assert
            Assert.Null(result);
        }

        [Theory]
        [InlineData("Nguyễn Văn A", "Nguyen Van A")]
        [InlineData("Đỗ Hoàng Dương", "Do Hoang Duong")]
        [InlineData("Phạm Vũ Anh Hùng", "Pham Vu Anh Hung")]
        [InlineData("Nguyễn Mạnh Trung", "Nguyen Manh Trung")]
        [InlineData("Phạm Tuấn Kiệt", "Pham Tuan Kiet")]
        public void RemoveDiacritics_ShouldRemoveVietnameseAccentsCorrectly(string input, string expected)
        {
            // Act
            var actual = StringHelper.RemoveDiacritics(input);

            // Assert
            Assert.Equal(expected, actual);
        }
    }
}
