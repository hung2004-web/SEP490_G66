using FluentAssertions;
using Moq;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.ClinicServices
{
    // OZ-SVC-10 Service variant management (list, create, update, toggle, delete)
    [Trait("Tab", "OZ-SVC-10")]
    public class ServiceVariantTests : ClinicServiceTestBase
    {
        private const int ServiceId = 5;
        private const int VariantId = 11;

        private static Service SampleService() => new() { Id = ServiceId, ServiceCode = "NIENG", ServiceName = "Nieng rang" };

        private static ServiceVariant SampleVariant(bool isActive = true) => new()
        {
            Id = VariantId,
            ServiceId = ServiceId,
            VariantCode = "NIENG-KL",
            VariantName = "Mac cai kim loai",
            ReferencePrice = 30000000m,
            EstimatedMinutes = 60,
            DisplayOrder = 1,
            IsActive = isActive
        };

        private static SaveServiceVariantRequest ValidRequest() => new()
        {
            VariantCode = " nieng-su ",
            VariantName = " Mac cai su ",
            Description = "  ",
            ReferencePrice = 40000000m,
            EstimatedMinutes = 90,
            DisplayOrder = 2
        };

        private void ServiceExists(bool exists = true)
        {
            _serviceRepositoryMock
                .Setup(r => r.GetByIdAsync(ServiceId, true, It.IsAny<CancellationToken>()))
                .ReturnsAsync(exists ? SampleService() : null);
        }

        private void VariantExists(ServiceVariant? variant)
        {
            _serviceRepositoryMock
                .Setup(r => r.GetVariantByIdAsync(ServiceId, VariantId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(variant);
        }

        [Fact]
        public async Task GetVariantsAsync_ShouldReturnVariants_WhenServiceExists()
        {
            ServiceExists();
            _serviceRepositoryMock
                .Setup(r => r.GetVariantsByServiceIdAsync(ServiceId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<ServiceVariant> { SampleVariant(), SampleVariant(isActive: false) });

            var result = await _service.GetVariantsAsync(ServiceId);

            result.Success.Should().BeTrue();
            result.Data.Should().HaveCount(2);
            result.Data![0].VariantCode.Should().Be("NIENG-KL");
        }

        [Fact]
        public async Task GetVariantsAsync_ShouldFail_WhenServiceNotFound()
        {
            ServiceExists(false);

            var result = await _service.GetVariantsAsync(ServiceId);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ServiceMessage.ServiceNotFound);
        }

        [Fact]
        public async Task CreateVariantAsync_ShouldNormalizeAndSave_WhenValid()
        {
            ServiceExists();
            ServiceVariant? added = null;
            _serviceRepositoryMock
                .Setup(r => r.AddVariantAsync(It.IsAny<ServiceVariant>(), It.IsAny<CancellationToken>()))
                .Callback<ServiceVariant, CancellationToken>((v, _) => added = v)
                .Returns(Task.CompletedTask);

            var result = await _service.CreateVariantAsync(ServiceId, ValidRequest());

            result.Success.Should().BeTrue();
            added.Should().NotBeNull();
            added!.ServiceId.Should().Be(ServiceId);
            added.VariantCode.Should().Be("NIENG-SU");
            added.VariantName.Should().Be("Mac cai su");
            added.Description.Should().BeNull();
            added.IsActive.Should().BeTrue();
            _serviceRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task CreateVariantAsync_ShouldFail_WhenServiceNotFound()
        {
            ServiceExists(false);

            var result = await _service.CreateVariantAsync(ServiceId, ValidRequest());

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ServiceMessage.ServiceNotFound);
            _serviceRepositoryMock.Verify(r => r.AddVariantAsync(It.IsAny<ServiceVariant>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task CreateVariantAsync_ShouldFail_WhenCodeExists()
        {
            ServiceExists();
            _serviceRepositoryMock
                .Setup(r => r.VariantCodeExistsAsync("NIENG-SU", null, It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

            var result = await _service.CreateVariantAsync(ServiceId, ValidRequest());

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ServiceVariantMessage.VariantCodeExist);
        }

        [Theory]
        [InlineData(-1, 30, 0, ErrorConstants.ServiceVariantMessage.InvalidPrice)]
        [InlineData(100, 0, 0, ErrorConstants.ServiceVariantMessage.InvalidEstimatedMinutes)]
        [InlineData(100, 30, -1, ErrorConstants.ServiceVariantMessage.InvalidDisplayOrder)]
        public async Task CreateVariantAsync_ShouldFail_WhenFieldsInvalid(decimal price, int minutes, int order, string expected)
        {
            ServiceExists();
            var request = ValidRequest();
            request.ReferencePrice = price;
            request.EstimatedMinutes = minutes;
            request.DisplayOrder = order;

            var result = await _service.CreateVariantAsync(ServiceId, request);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(expected);
        }

        [Fact]
        public async Task UpdateVariantAsync_ShouldUpdateFields_WhenValid()
        {
            var variant = SampleVariant();
            VariantExists(variant);

            var result = await _service.UpdateVariantAsync(ServiceId, VariantId, ValidRequest());

            result.Success.Should().BeTrue();
            variant.VariantCode.Should().Be("NIENG-SU");
            variant.ReferencePrice.Should().Be(40000000m);
            variant.IsActive.Should().BeTrue();
            variant.UpdatedAt.Should().NotBeNull();
        }

        [Fact]
        public async Task UpdateVariantAsync_ShouldFail_WhenVariantNotInService()
        {
            VariantExists(null);

            var result = await _service.UpdateVariantAsync(ServiceId, VariantId, ValidRequest());

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ServiceVariantMessage.VariantNotFound);
        }

        [Fact]
        public async Task UpdateVariantAsync_ShouldFail_WhenTurningOffWithOpenAppointments()
        {
            VariantExists(SampleVariant());
            _serviceRepositoryMock
                .Setup(r => r.VariantHasOpenAppointmentsAsync(VariantId, It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);
            var request = ValidRequest();
            request.IsActive = false;

            var result = await _service.UpdateVariantAsync(ServiceId, VariantId, request);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ServiceVariantMessage.HasOpenAppointments);
        }

        [Fact]
        public async Task ToggleVariantStatusAsync_ShouldTurnOff_WhenNoOpenAppointments()
        {
            var variant = SampleVariant();
            VariantExists(variant);

            var result = await _service.ToggleVariantStatusAsync(ServiceId, VariantId, false);

            result.Success.Should().BeTrue();
            variant.IsActive.Should().BeFalse();
            _serviceRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task ToggleVariantStatusAsync_ShouldFail_WhenOpenAppointments()
        {
            var variant = SampleVariant();
            VariantExists(variant);
            _serviceRepositoryMock
                .Setup(r => r.VariantHasOpenAppointmentsAsync(VariantId, It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

            var result = await _service.ToggleVariantStatusAsync(ServiceId, VariantId, false);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ServiceVariantMessage.HasOpenAppointments);
            variant.IsActive.Should().BeTrue();
        }

        [Fact]
        public async Task DeleteVariantAsync_ShouldDelete_WhenNeverBooked()
        {
            var variant = SampleVariant();
            VariantExists(variant);

            var result = await _service.DeleteVariantAsync(ServiceId, VariantId);

            result.Success.Should().BeTrue();
            _serviceRepositoryMock.Verify(r => r.DeleteVariantAsync(variant, It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task DeleteVariantAsync_ShouldFail_WhenAlreadyBooked()
        {
            VariantExists(SampleVariant());
            _serviceRepositoryMock
                .Setup(r => r.IsVariantInUseAsync(VariantId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

            var result = await _service.DeleteVariantAsync(ServiceId, VariantId);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ServiceVariantMessage.VariantInUse);
            _serviceRepositoryMock.Verify(r => r.DeleteVariantAsync(It.IsAny<ServiceVariant>(), It.IsAny<CancellationToken>()), Times.Never);
        }
    }
}
