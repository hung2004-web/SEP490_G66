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
    // OZ-AUTH-03 ResendOtp
    [Trait("Tab", "OZ-AUTH-03")]
    public class ResendOtpTests : AuthServiceTestBase
    {
        [Fact]
        public async Task ResendOtpAsync_AfterCooldown_ShouldSendNewCodeAndRestartSession()
        {
            // Arrange: the old code was sent 2 minutes ago and was typed wrong twice
            var pending = NewPending(failedAttempts: 2, expiresInMinutes: 1);
            var oldHash = pending.OtpHash;
            SetupPending(pending);
            SetupUnverifiedAccount(UnverifiedAccount());

            // Act
            var result = await _authService.ResendOtpAsync(ResendRequest());

            // Assert: a new code, a fresh time window and a clean attempt counter
            result.Success.Should().BeTrue();
            pending.OtpHash.Should().NotBe(oldHash);
            pending.FailedAttempts.Should().Be(0);
            pending.LastSentAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(30));
            pending.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(OtpLifetimeMinutes), TimeSpan.FromSeconds(30));
            _smsSenderMock.Verify(s => s.SendSmsAsync(NormalizedPhone, It.IsAny<string>()), Times.Once);
            _pendingStoreMock.Verify(s => s.Save(pending, It.IsAny<TimeSpan>()), Times.Once);
        }

        [Fact]
        public async Task ResendOtpAsync_TooSoon_ShouldFail()
        {
            // Arrange: the last code was sent 10 seconds ago (cooldown is 60 seconds)
            SetupPending(NewPending(sentSecondsAgo: 10));

            // Act
            var result = await _authService.ResendOtpAsync(ResendRequest());
                
            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpResendTooSoon);
            _smsSenderMock.Verify(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task ResendOtpAsync_WhenSessionNotFound_ShouldFail()
        {
            // Arrange
            SetupPending(null);

            // Act
            var result = await _authService.ResendOtpAsync(ResendRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpExpired);
        }

        [Fact]
        public async Task ResendOtpAsync_WhenSessionExpired_ShouldFail()
        {
            // Arrange
            SetupPending(NewPending(expiresInMinutes: -1));

            // Act
            var result = await _authService.ResendOtpAsync(ResendRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpExpired);
            _smsSenderMock.Verify(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task ResendOtpAsync_WhenUserRegisteredAgain_ShouldDropOldSession()
        {
            // Arrange: a later sign-up changed the security stamp, so this session is stale
            var account = UnverifiedAccount();
            account.SecurityStamp = "stamp-2";
            SetupPending(NewPending());
            SetupUnverifiedAccount(account);

            // Act
            var result = await _authService.ResendOtpAsync(ResendRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpExpired);
            _pendingStoreMock.Verify(s => s.Remove(RegisterSessionId), Times.Once);
            _smsSenderMock.Verify(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task ResendOtpAsync_WhenSmsFails_ShouldKeepOldCodeValid()
        {
            // Arrange
            var pending = NewPending();
            var oldHash = pending.OtpHash;
            SetupPending(pending);
            SetupUnverifiedAccount(UnverifiedAccount());
            _smsSenderMock
                .Setup(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()))
                .ThrowsAsync(new Exception("SMS gateway down"));

            // Act
            var result = await _authService.ResendOtpAsync(ResendRequest());

            // Assert: the code the user already has still works
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpSendFailed);
            pending.OtpHash.Should().Be(oldHash);
            _pendingStoreMock.Verify(s => s.Save(It.IsAny<PendingRegistration>(), It.IsAny<TimeSpan>()), Times.Never);
        }
    }
}
