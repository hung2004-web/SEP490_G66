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
    // OZ-AUTH-07 ChangePassword
    [Trait("Tab", "OZ-AUTH-07")]
    public class ChangePasswordTests : AuthServiceTestBase
    {
        [Fact]
        public async Task ChangePasswordAsync_WithValidRequest_ShouldChangePasswordAndSignOutAllDevices()
        {
            // Arrange: no current refresh token → every device must sign in again
            var user = ActiveUser();
            SetupFindById(user);
            SetupIdentityChangePassword(user, IdentityResult.Success);

            // Act
            var result = await _authService.ChangePasswordAsync(UserId, ValidChangeRequest());

            // Assert
            result.Success.Should().BeTrue();
            _userManagerMock.Verify(m => m.ChangePasswordAsync(user, CurrentPassword, NewPassword), Times.Once);
            _refreshTokenRepositoryMock.Verify(r => r.RevokeUserTokensAsync(UserId), Times.Once);
            _refreshTokenRepositoryMock.Verify(
                r => r.RevokeUserTokensExceptAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
            _refreshTokenRepositoryMock.Verify(r => r.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task ChangePasswordAsync_WithCurrentRefreshToken_ShouldKeepThisDeviceAndSignOutOthers()
        {
            // Arrange: BR-104 — keep the session that just changed the password
            const string currentRefreshToken = "current-device-token";
            var user = ActiveUser();
            SetupFindById(user);
            SetupIdentityChangePassword(user, IdentityResult.Success);
            _refreshTokenRepositoryMock
                .Setup(r => r.GetActiveTokenAsync(currentRefreshToken))
                .ReturnsAsync(new UserRefreshToken { UserId = UserId, RefreshToken = currentRefreshToken });

            var request = ValidChangeRequest();
            request.RefreshToken = currentRefreshToken;

            // Act
            var result = await _authService.ChangePasswordAsync(UserId, request);

            // Assert
            result.Success.Should().BeTrue();
            _refreshTokenRepositoryMock.Verify(
                r => r.RevokeUserTokensExceptAsync(UserId, currentRefreshToken), Times.Once);
            _refreshTokenRepositoryMock.Verify(r => r.RevokeUserTokensAsync(It.IsAny<string>()), Times.Never);
            _refreshTokenRepositoryMock.Verify(r => r.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task ChangePasswordAsync_WithForeignOrUnknownRefreshToken_ShouldSignOutAllDevices()
        {
            // Arrange: token missing or belonging to someone else → revoke everything
            const string foreignToken = "other-user-token";
            var user = ActiveUser();
            SetupFindById(user);
            SetupIdentityChangePassword(user, IdentityResult.Success);
            _refreshTokenRepositoryMock
                .Setup(r => r.GetActiveTokenAsync(foreignToken))
                .ReturnsAsync(new UserRefreshToken { UserId = "other-user", RefreshToken = foreignToken });

            var request = ValidChangeRequest();
            request.RefreshToken = foreignToken;

            // Act
            var result = await _authService.ChangePasswordAsync(UserId, request);

            // Assert
            result.Success.Should().BeTrue();
            _refreshTokenRepositoryMock.Verify(r => r.RevokeUserTokensAsync(UserId), Times.Once);
            _refreshTokenRepositoryMock.Verify(
                r => r.RevokeUserTokensExceptAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task ChangePasswordAsync_WithoutConfirmPassword_ShouldSkipMatchCheckAndSucceed()
        {
            // Arrange: the service only compares the confirmation when it is sent
            var user = ActiveUser();
            SetupFindById(user);
            SetupIdentityChangePassword(user, IdentityResult.Success);
            var request = ValidChangeRequest();
            request.ConfirmPassword = string.Empty;

            // Act
            var result = await _authService.ChangePasswordAsync(UserId, request);

            // Assert
            result.Success.Should().BeTrue();
        }

        [Fact]
        public async Task ChangePasswordAsync_WhenUserNotFound_ShouldFail()
        {
            // Arrange
            SetupFindById(null);

            // Act
            var result = await _authService.ChangePasswordAsync(UserId, ValidChangeRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.UserNotFound);
            VerifyPasswordNeverChanged();
            VerifyDevicesNeverSignedOut();
        }

        [Fact]
        public async Task ChangePasswordAsync_WhenNewPasswordSameAsCurrent_ShouldFail()
        {
            // Arrange
            SetupFindById(ActiveUser());
            var request = new ChangePasswordRequest
            {
                CurrentPassword = CurrentPassword,
                NewPassword = CurrentPassword,
                ConfirmPassword = CurrentPassword
            };

            // Act
            var result = await _authService.ChangePasswordAsync(UserId, request);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.SamePassword);
            VerifyPasswordNeverChanged();
        }

        [Fact]
        public async Task ChangePasswordAsync_WhenConfirmPasswordDoesNotMatch_ShouldFail()
        {
            // Arrange
            SetupFindById(ActiveUser());
            var request = ValidChangeRequest();
            request.ConfirmPassword = "Other@1234";

            // Act
            var result = await _authService.ChangePasswordAsync(UserId, request);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.PasswordMismatch);
            VerifyPasswordNeverChanged();
        }

        [Fact]
        public async Task ChangePasswordAsync_WhenCurrentPasswordIsWrong_ShouldReturnIdentityErrors()
        {
            // Arrange: Identity rejects the current password
            var user = ActiveUser();
            SetupFindById(user);
            SetupIdentityChangePassword(user, IdentityResult.Failed(
                new IdentityError { Code = "PasswordMismatch", Description = "Incorrect password." }));

            // Act
            var result = await _authService.ChangePasswordAsync(UserId, ValidChangeRequest());

            // Assert: no device is signed out when nothing changed
            result.Success.Should().BeFalse();
            result.Message.Should().Be("Change password failed");
            result.Errors.Should().Contain("Incorrect password.");
            VerifyDevicesNeverSignedOut();
        }

        [Fact]
        public async Task ChangePasswordAsync_WhenNewPasswordBreaksPolicy_ShouldReturnIdentityErrors()
        {
            // Arrange: Identity rejects a weak new password
            var user = ActiveUser();
            SetupFindById(user);
            SetupIdentityChangePassword(user, IdentityResult.Failed(
                new IdentityError { Code = "PasswordRequiresDigit", Description = "Passwords must have at least one digit." }));

            // Act
            var result = await _authService.ChangePasswordAsync(UserId, ValidChangeRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Errors.Should().Contain("Passwords must have at least one digit.");
            VerifyDevicesNeverSignedOut();
        }
    }
}
