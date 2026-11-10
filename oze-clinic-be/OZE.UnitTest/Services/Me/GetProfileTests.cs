using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.Me
{
    // OZ-ME-01 GetProfile
    [Trait("Tab", "OZ-ME-01")]
    public class GetProfileTests : UserServiceTestBase
    {
        // UTCID01 (N): a patient account returns the details from the patient record
        [Fact]
        public async Task GetUserProfileAsync_PatientUser_ReturnsPatientDetails()
        {
            var user = new ApplicationUser { Id = UserId, Email = Email, PhoneNumber = "+84912345678" };
            var patient = new Patient
            {
                UserId = UserId,
                FullName = "Nguyen Van A",
                PhoneNumber = "+84912345678",
                DateOfBirth = new DateOnly(2000, 1, 15),
                Gender = "Male",
                Address = "Ha Noi"
            };
            _userManagerMock.Setup(m => m.FindByIdAsync(UserId)).ReturnsAsync(user);
            _patientRepositoryMock.Setup(r => r.GetByUserIdAsync(UserId)).ReturnsAsync(patient);

            var result = await _userService.GetUserProfileAsync(UserId);

            result.Should().NotBeNull();
            result!.Id.Should().Be(UserId);
            result.Email.Should().Be(Email);
            result.FullName.Should().Be("Nguyen Van A");
            result.PhoneNumber.Should().Be("+84912345678");
            result.DateOfBirth.Should().Be(new DateOnly(2000, 1, 15));
            result.Gender.Should().Be("Male");
            result.Address.Should().Be("Ha Noi");
            result.Roles.Should().ContainSingle().Which.Should().Be(PatientRole);
        }

        // UTCID02 (N): a staff account has no patient record, so the name comes from the staff profile
        [Fact]
        public async Task GetUserProfileAsync_StaffUser_ReturnsStaffNameWithoutPatientDetails()
        {
            var user = new ApplicationUser
            {
                Id = UserId,
                Email = "doctor@oze.vn",
                PhoneNumber = "+84987654321",
                StaffProfile = new StaffProfile { FullName = "Tran Thi B" }
            };
            _userManagerMock.Setup(m => m.FindByIdAsync(UserId)).ReturnsAsync(user);
            _userManagerMock.Setup(m => m.Users).Returns(new List<ApplicationUser> { user }.AsQueryable());
            _userManagerMock.Setup(m => m.GetRolesAsync(user)).ReturnsAsync(new List<string> { "Doctor" });
            _patientRepositoryMock.Setup(r => r.GetByUserIdAsync(UserId)).ReturnsAsync((Patient?)null);

            var result = await _userService.GetUserProfileAsync(UserId);

            result.Should().NotBeNull();
            result!.FullName.Should().Be("Tran Thi B");
            result.PhoneNumber.Should().Be("+84987654321");
            result.DateOfBirth.Should().BeNull();
            result.Gender.Should().BeNull();
            result.Address.Should().BeNull();
            result.Roles.Should().ContainSingle().Which.Should().Be("Doctor");
        }

        // UTCID03 (A): an unknown user id returns null (the controller turns it into 404)
        [Fact]
        public async Task GetUserProfileAsync_UserNotFound_ReturnsNull()
        {
            _userManagerMock.Setup(m => m.FindByIdAsync("unknown-user")).ReturnsAsync((ApplicationUser?)null);

            var result = await _userService.GetUserProfileAsync("unknown-user");

            result.Should().BeNull();
            _patientRepositoryMock.Verify(r => r.GetByUserIdAsync(It.IsAny<string>()), Times.Never);
        }

        // UTCID04 (B): account without email or phone falls back to an empty email and the patient's phone
        [Fact]
        public async Task GetUserProfileAsync_UserWithoutEmailAndPhone_FallsBackToPatientPhone()
        {
            var user = new ApplicationUser { Id = UserId, Email = null, PhoneNumber = null };
            var patient = new Patient { UserId = UserId, FullName = "Le Van C", PhoneNumber = "+84911111111" };
            _userManagerMock.Setup(m => m.FindByIdAsync(UserId)).ReturnsAsync(user);
            _patientRepositoryMock.Setup(r => r.GetByUserIdAsync(UserId)).ReturnsAsync(patient);

            var result = await _userService.GetUserProfileAsync(UserId);

            result.Should().NotBeNull();
            result!.Email.Should().BeEmpty();
            result.PhoneNumber.Should().Be("+84911111111");
            result.FullName.Should().Be("Le Van C");
        }
    }
}
