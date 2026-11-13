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
    // OZ-AUTH-05 RefreshToken
    [Trait("Tab", "OZ-AUTH-05")]
    public class RefreshTokenTests : AuthServiceTestBase
    {
        [Fact]
        public async Task RefreshTokenAsync_WithActiveToken_ShouldReturnNewTokenPair()
        {
            // Arrange
            SetupOldToken(ActiveOldToken());
            SetupFindById(ActiveUser());

            // Act
            var result = await _authService.RefreshTokenAsync(OldTokenRequest());

            // Assert
            result.Success.Should().BeTrue();
            result.Data!.Token.Should().Be(AccessToken);
            result.Data.RefreshToken.Should().Be(RefreshToken);
            result.Data.FullName.Should().Be(UserFullName);
            result.Data.Role.Should().Be(UserRole);
        }

        [Fact]
        public async Task RefreshTokenAsync_WithActiveToken_ShouldRevokeOldToken()
        {
            // Arrange
            var oldToken = ActiveOldToken();
            SetupOldToken(oldToken);
            SetupFindById(ActiveUser());

            // Act
            await _authService.RefreshTokenAsync(OldTokenRequest());

            // Assert: the old token cannot be used again
            _refreshTokenRepositoryMock.Verify(r => r.TryRevokeAsync(oldToken.Id, It.IsAny<DateTimeOffset>()), Times.Once);
        }

        [Fact]
        public async Task RefreshTokenAsync_WhenAnotherCallRevokedTheTokenFirst_ShouldFailWithoutNewToken()
        {
            // Arrange: two calls with the same token at once; the other one revoked it first
            var oldToken = ActiveOldToken();
            SetupOldToken(oldToken);
            _refreshTokenRepositoryMock.Setup(r => r.TryRevokeAsync(oldToken.Id, It.IsAny<DateTimeOffset>())).ReturnsAsync(false);
            SetupFindById(ActiveUser());

            // Act
            var result = await _authService.RefreshTokenAsync(OldTokenRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidRefreshToken);
            _refreshTokenRepositoryMock.Verify(r => r.AddAsync(It.IsAny<UserRefreshToken>()), Times.Never);
        }

        [Fact]
        public async Task RefreshTokenAsync_WithActiveToken_ShouldSaveNewTokenValidForSevenDays()
        {
            // Arrange
            SetupOldToken(ActiveOldToken());
            SetupFindById(ActiveUser());
            UserRefreshToken? saved = null;
            _refreshTokenRepositoryMock
                .Setup(r => r.AddAsync(It.IsAny<UserRefreshToken>()))
                .Callback<UserRefreshToken>(t => saved = t);

            // Act
            await _authService.RefreshTokenAsync(OldTokenRequest());

            // Assert
            saved.Should().NotBeNull();
            saved!.UserId.Should().Be(UserId);
            saved.RefreshToken.Should().Be(RefreshToken);
            saved.ExpiryDate.Should().BeCloseTo(DateTimeOffset.UtcNow.AddDays(7), TimeSpan.FromMinutes(1));
            _refreshTokenRepositoryMock.Verify(r => r.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task RefreshTokenAsync_WithActiveToken_AccessTokenShouldExpireAfterConfiguredMinutes()
        {
            // Arrange
            SetupOldToken(ActiveOldToken());
            SetupFindById(ActiveUser());

            // Act
            var result = await _authService.RefreshTokenAsync(OldTokenRequest());

            // Assert: the service was built with ExpiresInMinutes = 30
            result.Data!.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(30), TimeSpan.FromMinutes(1));
        }

        [Fact]
        public async Task RefreshTokenAsync_WhenExpiryNotConfigured_AccessTokenShouldExpireAfterSixtyMinutes()
        {
            // Arrange
            var service = CreateService(jwtExpiresInMinutes: 0);
            SetupOldToken(ActiveOldToken());
            SetupFindById(ActiveUser());

            // Act
            var result = await service.RefreshTokenAsync(OldTokenRequest());

            // Assert
            result.Data!.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(60), TimeSpan.FromMinutes(1));
        }

        [Fact]
        public async Task RefreshTokenAsync_WithUnknownExpiredOrRevokedToken_ShouldFail()
        {
            // Arrange: the repository only returns tokens that are still active
            SetupOldToken(null);

            // Act
            var result = await _authService.RefreshTokenAsync(OldTokenRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidRefreshToken);
            _userManagerMock.Verify(m => m.FindByIdAsync(It.IsAny<string>()), Times.Never);
            VerifyNoTokenIssued();
        }

        [Fact]
        public async Task RefreshTokenAsync_WithTokenRevokedByDeactivation_ShouldReturnAccountDisabledCode()
        {
            // Arrange: DeactivateStaffAsync revoked the token and set LockoutEnd to MaxValue (BR-102, MSG80)
            var user = ActiveUser();
            user.LockoutEnd = DateTimeOffset.MaxValue;
            var revokedToken = ActiveOldToken();
            revokedToken.RevokedAt = DateTimeOffset.UtcNow.AddMinutes(-1);
            SetupOldToken(null);
            _refreshTokenRepositoryMock.Setup(r => r.GetByTokenAsync(OldRefreshToken)).ReturnsAsync(revokedToken);
            SetupFindById(user);

            // Act
            var result = await _authService.RefreshTokenAsync(OldTokenRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Code.Should().Be(ErrorConstants.AuthCode.AccountDisabled);
            result.Message.Should().Be(ErrorConstants.AuthMessage.AccountDisabled);
            VerifyNoTokenIssued();
        }

        [Fact]
        public async Task RefreshTokenAsync_WithRevokedTokenOfActiveUser_ShouldFailWithoutCode()
        {
            // Arrange: the token was revoked by logout, the account is still active
            var revokedToken = ActiveOldToken();
            revokedToken.RevokedAt = DateTimeOffset.UtcNow.AddMinutes(-1);
            SetupOldToken(null);
            _refreshTokenRepositoryMock.Setup(r => r.GetByTokenAsync(OldRefreshToken)).ReturnsAsync(revokedToken);
            SetupFindById(ActiveUser());

            // Act
            var result = await _authService.RefreshTokenAsync(OldTokenRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Code.Should().BeNull();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidRefreshToken);
            VerifyNoTokenIssued();
        }

        [Fact]
        public async Task RefreshTokenAsync_WhenUserDeleted_ShouldFailWithoutIssuingTokens()
        {
            // Arrange: the token is still active but its account no longer exists
            var oldToken = ActiveOldToken();
            SetupOldToken(oldToken);
            SetupFindById(null);

            // Act
            var result = await _authService.RefreshTokenAsync(OldTokenRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.UserNotFound);
            VerifyNoTokenIssued();
            _refreshTokenRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<UserRefreshToken>()), Times.Never);
        }

        [Fact]
        public async Task RefreshTokenAsync_WhenAccountDisabled_ShouldReturnAccountDisabledCode()
        {
            // Arrange: manager set LockoutEnd to MaxValue (MSG80)
            var user = ActiveUser();
            user.LockoutEnd = DateTimeOffset.MaxValue;
            var oldToken = ActiveOldToken();
            SetupOldToken(oldToken);
            SetupFindById(user);

            // Act
            var result = await _authService.RefreshTokenAsync(OldTokenRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Code.Should().Be(ErrorConstants.AuthCode.AccountDisabled);
            result.Message.Should().Be(ErrorConstants.AuthMessage.AccountDisabled);
            VerifyNoTokenIssued();
            _refreshTokenRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<UserRefreshToken>()), Times.Never);
            oldToken.RevokedAt.Should().BeNull();
        }

        [Fact]
        public async Task RefreshTokenAsync_WhenTemporarilyLockedOut_ShouldReturnLockedOutCode()
        {
            // Arrange: five failed logins on another device locked this account for 15 minutes
            var lockoutEnd = DateTimeOffset.UtcNow.AddMinutes(15);
            var user = ActiveUser();
            user.LockoutEnd = lockoutEnd;
            var oldToken = ActiveOldToken();
            SetupOldToken(oldToken);
            SetupFindById(user);

            // Act
            var result = await _authService.RefreshTokenAsync(OldTokenRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Code.Should().Be(ErrorConstants.AuthCode.LockedOut);
            result.Message.Should().Be(ErrorConstants.AuthMessage.AccountLocked);
            result.LockoutEnd.Should().Be(lockoutEnd);
            VerifyNoTokenIssued();
            _refreshTokenRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<UserRefreshToken>()), Times.Never);
        }

        [Fact]
        public async Task RefreshTokenAsync_WhenLockoutAlreadyEnded_ShouldReturnNewTokenPair()
        {
            // Arrange: temporary lockout has expired
            var user = ActiveUser();
            user.LockoutEnd = DateTimeOffset.UtcNow.AddMinutes(-1);
            SetupOldToken(ActiveOldToken());
            SetupFindById(user);

            // Act
            var result = await _authService.RefreshTokenAsync(OldTokenRequest());

            // Assert
            result.Success.Should().BeTrue();
            result.Data!.Token.Should().Be(AccessToken);
        }
    }
}
