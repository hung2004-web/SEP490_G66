using AutoMapper;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using OZE.Application.Interfaces;
using OZE.Application.MappingProfiles;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Models.Base;
using OZE.Common.Models;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.Patients
{
    // OZ-PAT-01 GetPatients
    [Trait("Tab", "OZ-PAT-01")]
    public class GetPatientsTests : PatientServiceTestBase
    {
        [Fact]
        public async Task GetPatientsAsync_ShouldReturnPagedPatients()
        {
            // Arrange
            var parameters = new PatientQueryParameters { PageNumber = 1, PageSize = 10 };
            var patients = new List<Patient>
            {
                new() { Id = 1, PatientCode = "BN-261021-123456", FullName = "Nguyen Van A" }
            };
            var pagedResult = new PagedResult<Patient>(patients, 1, 1, 10);

            _patientRepositoryMock
                .Setup(r => r.GetAllAsync(parameters, It.IsAny<CancellationToken>()))
                .ReturnsAsync(pagedResult);

            // Act
            var result = await _patientService.GetPatientsAsync(parameters);

            // Assert
            result.Success.Should().BeTrue();
            result.Data.Should().NotBeNull();
            result.Data!.Items.Should().HaveCount(1);
            result.Data.Items[0].FullName.Should().Be("Nguyen Van A");
        }
    }
}
