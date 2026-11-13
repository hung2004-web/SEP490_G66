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
    // OZ-AUTH-06 Logout
    [Trait("Tab", "OZ-AUTH-06")]
    public class LogoutTests : AuthServiceTestBase
    {
        [Fact]
        public async Task LogoutAsync_WithoutRefreshToken_ShouldSignOutAllDevices()
        {
            // Act
            var result = await _authService.LogoutAsync(UserId);

            // Assert
            result.Success.Should().BeTrue();
            _refreshTokenRepositoryMock.Verify(r => r.RevokeUserTokensAsync(UserId), Times.Once);
            _refreshTokenRepositoryMock.Verify(r => r.GetActiveTokenAsync(It.IsAny<string>()), Times.Never);
            _refreshTokenRepositoryMock.Verify(r => r.SaveChangesAsync(), Times.Once);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public async Task LogoutAsync_WithBlankRefreshToken_ShouldSignOutAllDevices(string blankToken)
        {
            // Act
            var result = await _authService.LogoutAsync(UserId, blankToken);

            // Assert: a blank token is treated the same as no token
            result.Success.Should().BeTrue();
            _refreshTokenRepositoryMock.Verify(r => r.RevokeUserTokensAsync(UserId), Times.Once);
        }

        [Fact]
        public async Task LogoutAsync_WithOwnRefreshToken_ShouldSignOutOnlyThatDevice()
        {
            // Arrange
            var token = new UserRefreshToken { UserId = UserId, RefreshToken = DeviceToken };
            SetupActiveToken(token);

            // Act
            var result = await _authService.LogoutAsync(UserId, DeviceToken);

            // Assert: only this token is revoked, other devices stay signed in
            result.Success.Should().BeTrue();
            token.RevokedAt.Should().NotBeNull();
            _refreshTokenRepositoryMock.Verify(r => r.UpdateAsync(token), Times.Once);
            _refreshTokenRepositoryMock.Verify(r => r.RevokeUserTokensAsync(It.IsAny<string>()), Times.Never);
            _refreshTokenRepositoryMock.Verify(r => r.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task LogoutAsync_WithRefreshTokenOnly_ShouldRevokeWithoutUserId()
        {
            // Arrange: access token already expired; only the refresh token is sent
            var token = new UserRefreshToken { UserId = UserId, RefreshToken = DeviceToken };
            SetupActiveToken(token);

            // Act
            var result = await _authService.LogoutAsync(null, DeviceToken);

            // Assert
            result.Success.Should().BeTrue();
            token.RevokedAt.Should().NotBeNull();
            _refreshTokenRepositoryMock.Verify(r => r.UpdateAsync(token), Times.Once);
            _refreshTokenRepositoryMock.Verify(r => r.RevokeUserTokensAsync(It.IsAny<string>()), Times.Never);
            _refreshTokenRepositoryMock.Verify(r => r.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task LogoutAsync_WithRefreshToken_ShouldRevokeEvenIfUserIdDiffers()
        {
            // Arrange: possession of the refresh token is enough to end that session
            var token = new UserRefreshToken { UserId = "other-user", RefreshToken = DeviceToken };
            SetupActiveToken(token);

            // Act
            var result = await _authService.LogoutAsync(UserId, DeviceToken);

            // Assert
            result.Success.Should().BeTrue();
            token.RevokedAt.Should().NotBeNull();
            _refreshTokenRepositoryMock.Verify(r => r.UpdateAsync(token), Times.Once);
            _refreshTokenRepositoryMock.Verify(r => r.RevokeUserTokensAsync(It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task LogoutAsync_WithUnknownOrExpiredRefreshToken_ShouldStillSucceed()
        {
            // Arrange: the token is no longer active
            SetupActiveToken(null);

            // Act
            var result = await _authService.LogoutAsync(UserId, DeviceToken);

            // Assert: logging out twice must not fail
            result.Success.Should().BeTrue();
            _refreshTokenRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<UserRefreshToken>()), Times.Never);
            _refreshTokenRepositoryMock.Verify(r => r.RevokeUserTokensAsync(It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task LogoutAsync_WithoutUserIdOrRefreshToken_ShouldFail()
        {
            // Act
            var result = await _authService.LogoutAsync(null, null);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.LogoutRequiresToken);
            _refreshTokenRepositoryMock.Verify(r => r.SaveChangesAsync(), Times.Never);
        }
    }
}
