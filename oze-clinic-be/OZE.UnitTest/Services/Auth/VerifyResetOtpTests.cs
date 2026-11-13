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
    // OZ-AUTH-10 VerifyResetOtp
    [Trait("Tab", "OZ-AUTH-10")]
    public class VerifyResetOtpTests : AuthServiceTestBase
    {
        [Fact]
        public async Task VerifyResetOtpAsync_WithCorrectOtp_ShouldUnlockPasswordReset()
        {
            // Arrange
            var session = NewResetSession();
            var user = ActiveUser();
            SetupResetSession(session);
            SetupFindById(user);
            _userManagerMock.Setup(m => m.GeneratePasswordResetTokenAsync(user)).ReturnsAsync(IdentityResetToken);

            // Act
            var result = await _authService.VerifyResetOtpAsync(ResetOtpRequest(CorrectOtp));

            // Assert: the session now carries what ResetPasswordAsync checks for
            result.Success.Should().BeTrue();
            session.IsOtpVerified.Should().BeTrue();
            session.ResetToken.Should().Be(IdentityResetToken);
            _passwordResetStoreMock.Verify(s => s.Save(session, It.IsAny<TimeSpan>()), Times.Once);
        }

        [Fact]
        public async Task VerifyResetOtpAsync_WithCorrectOtp_ShouldGiveFreshTimeToTypeNewPassword()
        {
            // Arrange: only 1 minute left on the code
            var session = NewResetSession(expiresInMinutes: 1);
            var user = ActiveUser();
            SetupResetSession(session);
            SetupFindById(user);
            _userManagerMock.Setup(m => m.GeneratePasswordResetTokenAsync(user)).ReturnsAsync(IdentityResetToken);

            // Act
            await _authService.VerifyResetOtpAsync(ResetOtpRequest(CorrectOtp));

            // Assert
            session.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(OtpLifetimeMinutes), TimeSpan.FromSeconds(30));
        }

        [Fact]
        public async Task VerifyResetOtpAsync_WithSpacesAroundOtp_ShouldStillMatch()
        {
            // Arrange
            var session = NewResetSession();
            var user = ActiveUser();
            SetupResetSession(session);
            SetupFindById(user);
            _userManagerMock.Setup(m => m.GeneratePasswordResetTokenAsync(user)).ReturnsAsync(IdentityResetToken);

            // Act
            var result = await _authService.VerifyResetOtpAsync(ResetOtpRequest($" {CorrectOtp} "));

            // Assert
            result.Success.Should().BeTrue();
        }

        [Fact]
        public async Task VerifyResetOtpAsync_WhenSessionNotFound_ShouldFail()
        {
            // Arrange
            SetupResetSession(null);

            // Act
            var result = await _authService.VerifyResetOtpAsync(ResetOtpRequest(CorrectOtp));

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.ResetSessionInvalid);
            VerifyResetTokenNeverCreated();
        }

        [Fact]
        public async Task VerifyResetOtpAsync_WhenSessionExpired_ShouldFailEvenWithCorrectOtp()
        {
            // Arrange
            SetupResetSession(NewResetSession(expiresInMinutes: -1));

            // Act
            var result = await _authService.VerifyResetOtpAsync(ResetOtpRequest(CorrectOtp));

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.ResetSessionInvalid);
            VerifyResetTokenNeverCreated();
        }

        [Fact]
        public async Task VerifyResetOtpAsync_WithWrongOtp_ShouldCountFailedAttempt()
        {
            // Arrange
            var session = NewResetSession();
            SetupResetSession(session);

            // Act
            var result = await _authService.VerifyResetOtpAsync(ResetOtpRequest(WrongOtp));

            // Assert: the attempt is remembered and the session stays locked
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidOtp);
            session.FailedAttempts.Should().Be(1);
            session.IsOtpVerified.Should().BeFalse();
            _passwordResetStoreMock.Verify(s => s.Save(session, It.IsAny<TimeSpan>()), Times.Once);
            _passwordResetStoreMock.Verify(s => s.Remove(It.IsAny<string>()), Times.Never);
            VerifyResetTokenNeverCreated();
        }

        [Fact]
        public async Task VerifyResetOtpAsync_WithWrongOtpOnLastAttempt_ShouldDeleteSession()
        {
            // Arrange: one attempt left
            SetupResetSession(NewResetSession(failedAttempts: MaxOtpAttempts - 1));

            // Act
            var result = await _authService.VerifyResetOtpAsync(ResetOtpRequest(WrongOtp));

            // Assert: the user must request a new code
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidOtp);
            _passwordResetStoreMock.Verify(s => s.Remove(ResetSessionId), Times.Once);
            _passwordResetStoreMock.Verify(s => s.Save(It.IsAny<PasswordResetSession>(), It.IsAny<TimeSpan>()), Times.Never);
        }

        [Fact]
        public async Task VerifyResetOtpAsync_AfterTooManyWrongAttempts_ShouldRejectEvenCorrectOtp()
        {
            // Arrange: someone already guessed 5 times
            SetupResetSession(NewResetSession(failedAttempts: MaxOtpAttempts));

            // Act
            var result = await _authService.VerifyResetOtpAsync(ResetOtpRequest(CorrectOtp));

            // Assert: guessing is blocked, so the right code no longer works either
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.ResetSessionInvalid);
            _passwordResetStoreMock.Verify(s => s.Remove(ResetSessionId), Times.Once);
            VerifyResetTokenNeverCreated();
        }

        [Fact]
        public async Task VerifyResetOtpAsync_WhenUserDeleted_ShouldFailAndDeleteSession()
        {
            // Arrange: the code is right but the account no longer exists
            SetupResetSession(NewResetSession());
            SetupFindById(null);

            // Act
            var result = await _authService.VerifyResetOtpAsync(ResetOtpRequest(CorrectOtp));

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.UserNotFound);
            _passwordResetStoreMock.Verify(s => s.Remove(ResetSessionId), Times.Once);
            VerifyResetTokenNeverCreated();
        }
    }
}
