using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
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

namespace OZE.UnitTest.Services.Auth
{
    // OZ-AUTH-04 Login
    [Trait("Tab", "OZ-AUTH-04")]
    public class LoginTests : AuthServiceTestBase
    {
        [Fact]
        public async Task LoginAsync_WithCorrectEmailAndPassword_ShouldReturnTokens()
        {
            // Arrange
            var user = ActiveUser();
            SetupFindByEmail(user);
            SetupPasswordCheck(user, SignInResult.Success);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert
            result.Success.Should().BeTrue();
            result.Data!.Token.Should().Be(AccessToken);
            result.Data.RefreshToken.Should().Be(RefreshToken);
            result.Data.FullName.Should().Be(UserFullName);
            result.Data.Role.Should().Be(UserRole);
        }

        [Fact]
        public async Task LoginAsync_WhenSuccessful_ShouldSaveRefreshTokenValidForSevenDays()
        {
            // Arrange
            var user = ActiveUser();
            SetupFindByEmail(user);
            SetupPasswordCheck(user, SignInResult.Success);
            UserRefreshToken? saved = null;
            _refreshTokenRepositoryMock
                .Setup(r => r.AddAsync(It.IsAny<UserRefreshToken>()))
                .Callback<UserRefreshToken>(t => saved = t);

            // Act
            await _authService.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert
            saved.Should().NotBeNull();
            saved!.UserId.Should().Be(user.Id);
            saved.RefreshToken.Should().Be(RefreshToken);
            saved.ExpiryDate.Should().BeCloseTo(DateTimeOffset.UtcNow.AddDays(7), TimeSpan.FromMinutes(1));
            _refreshTokenRepositoryMock.Verify(r => r.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task LoginAsync_WhenSuccessful_AccessTokenShouldExpireAfterConfiguredMinutes()
        {
            // Arrange
            var user = ActiveUser();
            SetupFindByEmail(user);
            SetupPasswordCheck(user, SignInResult.Success);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert: the service was built with ExpiresInMinutes = 30
            result.Data!.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(30), TimeSpan.FromMinutes(1));
        }

        [Fact]
        public async Task LoginAsync_WhenExpiryNotConfigured_AccessTokenShouldExpireAfterSixtyMinutes()
        {
            // Arrange
            var service = CreateService(jwtExpiresInMinutes: 0);
            var user = ActiveUser();
            SetupFindByEmail(user);
            SetupPasswordCheck(user, SignInResult.Success);

            // Act
            var result = await service.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert
            result.Data!.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(60), TimeSpan.FromMinutes(1));
        }

        [Fact]
        public async Task LoginAsync_WithSpacesAroundEmail_ShouldTrimAndSucceed()
        {
            // Arrange
            var user = ActiveUser();
            SetupFindByEmail(user);
            SetupPasswordCheck(user, SignInResult.Success);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = $"  {Email}  ", Password = Password });

            // Assert
            result.Success.Should().BeTrue();
        }

        [Theory]
        [InlineData("0912345678")]
        [InlineData("+84912345678")]
        [InlineData("84912345678")]
        [InlineData("0912 345 678")]
        [InlineData("0912.345.678")]
        [InlineData("0912-345-678")]
        public async Task LoginAsync_WithPhoneNumberInAnyFormat_ShouldFindUserByAllStoredVariants(string phone)
        {
            // Arrange: the lookup must cover every way the number may be stored
            var user = ActiveUser();
            _registrationRepositoryMock
                .Setup(r => r.FindUserByPhoneAsync(It.Is<IReadOnlyCollection<string>>(v =>
                    v.Contains("+84912345678") && v.Contains("84912345678") && v.Contains("0912345678"))))
                .ReturnsAsync(user);
            SetupPasswordCheck(user, SignInResult.Success);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = phone, Password = Password });

            // Assert
            result.Success.Should().BeTrue();
            _userManagerMock.Verify(m => m.FindByEmailAsync(It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task LoginAsync_ShouldLockAccountAfterTooManyFailures()
        {
            // Arrange
            var user = ActiveUser();
            SetupFindByEmail(user);
            SetupPasswordCheck(user, SignInResult.Success);

            // Act
            await _authService.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert: lockoutOnFailure must be true so repeated wrong passwords lock the account
            _signInManagerMock.Verify(s => s.CheckPasswordSignInAsync(user, Password, true), Times.Once);
        }

        [Fact]
        public async Task LoginAsync_StaffWithUnconfirmedContact_ShouldStillBeAbleToLogIn()
        {
            // Arrange: only patients go through OTP registration, so a staff account is never "pending"
            var user = PendingRegistrationUser();
            SetupFindByEmail(user);
            _userManagerMock.Setup(m => m.IsInRoleAsync(user, RoleConstants.PatientRole)).ReturnsAsync(false);
            SetupPasswordCheck(user, SignInResult.Success);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert
            result.Success.Should().BeTrue();
        }

        [Fact]
        public async Task LoginAsync_WhenEmailNotFound_ShouldReturnInvalidLogin()
        {
            // Arrange
            SetupFindByEmail(null);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidLogin);
            result.Code.Should().Be(ErrorConstants.AuthCode.InvalidCredentials);
            VerifyPasswordNeverChecked();
            VerifyNoTokenIssued();
        }

        [Fact]
        public async Task LoginAsync_WhenPhoneNotFound_ShouldReturnInvalidLogin()
        {   
            // Arrange
            _registrationRepositoryMock
                .Setup(r => r.FindUserByPhoneAsync(It.IsAny<IReadOnlyCollection<string>>()))
                .ReturnsAsync((ApplicationUser?)null);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = "0912345678", Password = Password });

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidLogin);
            result.Code.Should().Be(ErrorConstants.AuthCode.InvalidCredentials);
            VerifyPasswordNeverChecked();
        }

        [Theory]
        [InlineData("abc123")]          // letters
        [InlineData("091234567")]       // too short
        [InlineData("09123456789")]     // too long
        [InlineData("0112345678")]      // not a Vietnamese mobile prefix
        [InlineData("+1 202 555 0143")] // foreign number
        public async Task LoginAsync_WithInvalidPhoneNumber_ShouldReturnInvalidLoginWithoutQueryingDatabase(string phone)
        {
            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = phone, Password = Password });

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidLogin);
            result.Code.Should().Be(ErrorConstants.AuthCode.InvalidCredentials);
            _registrationRepositoryMock.Verify(r => r.FindUserByPhoneAsync(It.IsAny<IReadOnlyCollection<string>>()), Times.Never);
            VerifyPasswordNeverChecked();
        }

        [Fact]
        public async Task LoginAsync_WhenRegistrationNotVerified_ShouldReturnInvalidLogin()
        {
            // Arrange: a patient who never entered the OTP is locked "forever" until verified
            var user = PendingRegistrationUser();
            SetupFindByEmail(user);
            _userManagerMock.Setup(m => m.IsInRoleAsync(user, RoleConstants.PatientRole)).ReturnsAsync(true);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert: say "invalid login", not "locked" or "disabled"
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidLogin);
            result.Code.Should().Be(ErrorConstants.AuthCode.InvalidCredentials);
            VerifyPasswordNeverChecked();
            VerifyNoTokenIssued();
        }

        [Fact]
        public async Task LoginAsync_WithWrongPassword_ShouldReturnInvalidLogin()
        {
            // Arrange
            var user = ActiveUser();
            SetupFindByEmail(user);
            SetupPasswordCheck(user, SignInResult.Failed);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidLogin);
            result.Code.Should().Be(ErrorConstants.AuthCode.InvalidCredentials);
            VerifyNoTokenIssued();
        }

        [Fact]
        public async Task LoginAsync_WhenLockedOut_ShouldReturnLockedOutCodeAndLockoutEnd()
        {
            // Arrange
            var lockoutEnd = DateTimeOffset.UtcNow.AddMinutes(15);
            var user = ActiveUser();
            user.LockoutEnd = lockoutEnd;
            SetupFindByEmail(user);
            SetupPasswordCheck(user, SignInResult.LockedOut);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.AccountLocked);
            result.Code.Should().Be(ErrorConstants.AuthCode.LockedOut);
            result.LockoutEnd.Should().Be(lockoutEnd);
            VerifyNoTokenIssued();
        }

        [Fact]
        public async Task LoginAsync_WhenAccountDisabled_ShouldReturnAccountDisabledCode()
        {
            // Arrange: manager deactivation sets LockoutEnd to MaxValue; Identity reports LockedOut
            var user = ActiveUser();
            user.LockoutEnd = DateTimeOffset.MaxValue;
            SetupFindByEmail(user);
            SetupPasswordCheck(user, SignInResult.LockedOut);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.AccountDisabled);
            result.Code.Should().Be(ErrorConstants.AuthCode.AccountDisabled);
            result.LockoutEnd.Should().BeNull();
            VerifyNoTokenIssued();
        }

        [Fact]
        public async Task LoginAsync_WhenSignInNotAllowed_ShouldReturnInvalidLogin()
        {
            // Arrange: Identity can refuse sign-in, e.g. when confirmation is required
            var user = ActiveUser();
            SetupFindByEmail(user);
            SetupPasswordCheck(user, SignInResult.NotAllowed);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidLogin);
            result.Code.Should().Be(ErrorConstants.AuthCode.InvalidCredentials);
            VerifyNoTokenIssued();
        }
    }
}
