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
    // OZ-AUTH-11 ResetPassword
    [Trait("Tab", "OZ-AUTH-11")]
    public class ResetPasswordTests : AuthServiceTestBase
    {
        [Fact]
        public async Task ResetPasswordAsync_WithVerifiedSession_ShouldSetNewPasswordAndSignOutAllDevices()
        {
            // Arrange
            var user = ActiveUser();
            SetupResetSession(VerifiedResetSession());
            SetupFindById(user);
            SetupIdentityResetPassword(user, IdentityResult.Success);

            // Act
            var result = await _authService.ResetPasswordAsync(NewPasswordRequest());

            // Assert: the session is used once, and old logins are cut off
            result.Success.Should().BeTrue();
            _userManagerMock.Verify(m => m.ResetPasswordAsync(user, IdentityResetToken, ResetNewPassword), Times.Once);
            _passwordResetStoreMock.Verify(s => s.Remove(ResetSessionId), Times.Once);
            _refreshTokenRepositoryMock.Verify(r => r.RevokeUserTokensAsync(user.Id), Times.Once);
            _refreshTokenRepositoryMock.Verify(r => r.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task ResetPasswordAsync_WhenSessionNotFound_ShouldFail()
        {
            // Arrange
            SetupResetSession(null);

            // Act
            var result = await _authService.ResetPasswordAsync(NewPasswordRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.ResetSessionInvalid);
            VerifyPasswordNeverReset();
        }

        [Fact]
        public async Task ResetPasswordAsync_WhenOtpNotVerifiedYet_ShouldFail()
        {
            // Arrange: the user skipped the OTP step
            SetupResetSession(NewResetSession());

            // Act
            var result = await _authService.ResetPasswordAsync(NewPasswordRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.ResetSessionInvalid);
            VerifyPasswordNeverReset();
        }

        [Fact]
        public async Task ResetPasswordAsync_WhenResetTokenMissing_ShouldFail()
        {
            // Arrange: marked verified but Identity never issued a token
            var session = VerifiedResetSession();
            session.ResetToken = null;
            SetupResetSession(session);

            // Act
            var result = await _authService.ResetPasswordAsync(NewPasswordRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.ResetSessionInvalid);
            VerifyPasswordNeverReset();
        }

        [Fact]
        public async Task ResetPasswordAsync_WhenSessionExpired_ShouldFail()
        {
            // Arrange
            var session = VerifiedResetSession();
            session.ExpiresAt = DateTime.UtcNow.AddMinutes(-1);
            SetupResetSession(session);

            // Act
            var result = await _authService.ResetPasswordAsync(NewPasswordRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.ResetSessionInvalid);
            VerifyPasswordNeverReset();
        }

        [Fact]
        public async Task ResetPasswordAsync_WhenUserDeleted_ShouldFailAndDeleteSession()
        {
            // Arrange
            SetupResetSession(VerifiedResetSession());
            SetupFindById(null);

            // Act
            var result = await _authService.ResetPasswordAsync(NewPasswordRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.UserNotFound);
            _passwordResetStoreMock.Verify(s => s.Remove(ResetSessionId), Times.Once);
            VerifyPasswordNeverReset();
        }

        [Fact]
        public async Task ResetPasswordAsync_WhenPasswordBreaksPolicy_ShouldKeepSessionForRetry()
        {
            // Arrange: Identity rejects a weak password
            var user = ActiveUser();
            SetupResetSession(VerifiedResetSession());
            SetupFindById(user);
            SetupIdentityResetPassword(user, IdentityResult.Failed(
                new IdentityError { Code = "PasswordTooShort", Description = "Passwords must be at least 8 characters." }));

            // Act
            var result = await _authService.ResetPasswordAsync(NewPasswordRequest());

            // Assert: the user can try again without a new code
            result.Success.Should().BeFalse();
            result.Message.Should().Be("Reset password failed");
            result.Errors.Should().Contain("Passwords must be at least 8 characters.");
            _passwordResetStoreMock.Verify(s => s.Remove(It.IsAny<string>()), Times.Never);
            _refreshTokenRepositoryMock.Verify(r => r.RevokeUserTokensAsync(It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task PasswordRecovery_ForgotThenVerifyThenReset_ShouldSucceed()
        {
            // Arrange: a store that really keeps sessions between the three calls
            var sessions = new Dictionary<string, PasswordResetSession>();
            _passwordResetStoreMock
                .Setup(s => s.Save(It.IsAny<PasswordResetSession>(), It.IsAny<TimeSpan>()))
                .Callback<PasswordResetSession, TimeSpan>((session, _) => sessions[session.SessionId] = session);
            _passwordResetStoreMock
                .Setup(s => s.Get(It.IsAny<string>()))
                .Returns<string>(id => sessions.GetValueOrDefault(id));
            _passwordResetStoreMock
                .Setup(s => s.Remove(It.IsAny<string>()))
                .Callback<string>(id => sessions.Remove(id));

            var user = ActiveUser();
            SetupFindByPhone(user);
            SetupFindById(user);
            _userManagerMock.Setup(m => m.GeneratePasswordResetTokenAsync(user)).ReturnsAsync(IdentityResetToken);
            _userManagerMock
                .Setup(m => m.ResetPasswordAsync(user, IdentityResetToken, ResetNewPassword))
                .ReturnsAsync(IdentityResult.Success);

            string? sms = null;
            _smsSenderMock
                .Setup(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()))
                .Callback<string, string>((_, message) => sms = message)
                .Returns(Task.CompletedTask);

            // Act 1: ask for a code
            var forgot = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Phone });
            var sessionId = forgot.Data!.SessionId;
            var codeFromSms = System.Text.RegularExpressions.Regex.Match(sms!, @"\d{6}").Value;

            // Act 2: type the code from the SMS
            var verify = await _authService.VerifyResetOtpAsync(new VerifyResetOtpRequest { SessionId = sessionId, Otp = codeFromSms });

            // Act 3: choose a new password
            var reset = await _authService.ResetPasswordAsync(new ResetPasswordRequest
            {
                SessionId = sessionId,
                NewPassword = ResetNewPassword,
                ConfirmPassword = ResetNewPassword
            });

            // Assert: every step passes and the session cannot be reused
            forgot.Success.Should().BeTrue();
            verify.Success.Should().BeTrue();
            reset.Success.Should().BeTrue();
            sessions.Should().NotContainKey(sessionId);
        }

        [Fact]
        public async Task PasswordRecovery_SkippingOtpStep_ShouldNotResetPassword()
        {
            // Arrange: the store keeps the session from step 1
            var sessions = new Dictionary<string, PasswordResetSession>();
            _passwordResetStoreMock
                .Setup(s => s.Save(It.IsAny<PasswordResetSession>(), It.IsAny<TimeSpan>()))
                .Callback<PasswordResetSession, TimeSpan>((session, _) => sessions[session.SessionId] = session);
            _passwordResetStoreMock
                .Setup(s => s.Get(It.IsAny<string>()))
                .Returns<string>(id => sessions.GetValueOrDefault(id));
            SetupFindByPhone(ActiveUser());

            // Act: go straight from step 1 to step 3
            var forgot = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Phone });
            var reset = await _authService.ResetPasswordAsync(new ResetPasswordRequest
            {
                SessionId = forgot.Data!.SessionId,
                NewPassword = ResetNewPassword,
                ConfirmPassword = ResetNewPassword
            });

            // Assert: knowing the session id is not enough without the code
            reset.Success.Should().BeFalse();
            reset.Message.Should().Be(ErrorConstants.AuthMessage.ResetSessionInvalid);
            VerifyPasswordNeverReset();
        }
    }
}
