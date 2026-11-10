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
    // OZ-AUTH-09 ForgotPassword
    [Trait("Tab", "OZ-AUTH-09")]
    public class ForgotPasswordTests : AuthServiceTestBase
    {
        [Fact]
        public async Task ForgotPasswordAsync_WhenPatientPhoneNeverConfirmed_ShouldNotSendCode()
        {
            // Arrange: a patient who signed up by email; whoever holds the phone they typed may not be them
            var user = ActiveUser();
            user.PhoneNumberConfirmed = false;
            SetupFindByPhone(user);
            _userManagerMock.Setup(m => m.IsInRoleAsync(user, RoleConstants.PatientRole)).ReturnsAsync(true);

            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Phone });

            // Assert
            result.Success.Should().BeTrue();
            VerifyNothingSentAndNoSessionSaved();
        }

        [Fact]
        public async Task ForgotPasswordAsync_WhenStaffEmailNotConfirmed_ShouldStillSendCode()
        {
            // Arrange: staff emails are set by the manager and never go through a confirmation link
            var user = ActiveUser();
            user.EmailConfirmed = false;
            SetupFindByEmail(user);

            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Email });

            // Assert
            result.Success.Should().BeTrue();
            _emailSenderMock.Verify(e => e.SendEmailAsync(Email, It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        }

        [Fact]
        public async Task ForgotPasswordAsync_WithEmail_ShouldSendCodeByEmailAndSaveSession()
        {
            // Arrange
            var user = ActiveUser();
            SetupFindByEmail(user);
            PasswordResetSession? saved = null;
            _passwordResetStoreMock
                .Setup(s => s.Save(It.IsAny<PasswordResetSession>(), It.IsAny<TimeSpan>()))
                .Callback<PasswordResetSession, TimeSpan>((session, _) => saved = session);

            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Email });

            // Assert: the code goes by email only
            result.Success.Should().BeTrue();
            result.Data!.VerificationMethod.Should().Be(VerificationMethodConstants.Email);
            _emailSenderMock.Verify(e => e.SendEmailAsync(Email, It.IsAny<string>(), It.IsAny<string>()), Times.Once);
            _smsSenderMock.Verify(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);

            // The session belongs to this user, is not verified yet and is returned to the client
            saved.Should().NotBeNull();
            saved!.UserId.Should().Be(user.Id);
            saved.IsOtpVerified.Should().BeFalse();
            saved.ResetToken.Should().BeNull();
            saved.OtpHash.Should().NotBeNullOrEmpty();
            result.Data.SessionId.Should().Be(saved.SessionId);
        }

        [Fact]
        public async Task ForgotPasswordAsync_WithPhone_ShouldSendCodeBySmsToNormalizedNumber()
        {
            // Arrange
            SetupFindByPhone(ActiveUser());

            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Phone });

            // Assert: the SMS goes to the +84 form, never by email
            result.Success.Should().BeTrue();
            result.Data!.VerificationMethod.Should().Be(VerificationMethodConstants.Sms);
            _smsSenderMock.Verify(s => s.SendSmsAsync(NormalizedPhone, It.IsAny<string>()), Times.Once);
            _emailSenderMock.Verify(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
            _passwordResetStoreMock.Verify(s => s.Save(It.IsAny<PasswordResetSession>(), It.IsAny<TimeSpan>()), Times.Once);
        }

        [Fact]
        public async Task ForgotPasswordAsync_ShouldMaskWhereTheCodeWasSent()
        {
            // Arrange
            SetupFindByEmail(ActiveUser());
            SetupFindByPhone(ActiveUser());

            // Act
            var byEmail = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Email });
            var byPhone = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Phone });

            // Assert: the full address or number is never sent back
            byEmail.Data!.MaskedDestination.Should().NotBe(Email).And.Contain("*").And.EndWith("@oze.vn");
            byPhone.Data!.MaskedDestination.Should().NotBe(NormalizedPhone).And.Contain("*");
        }

        [Fact]
        public async Task ForgotPasswordAsync_ShouldNotPutTheCodeInTheResponse()
        {
            // Arrange: capture the SMS to learn the real code
            SetupFindByPhone(ActiveUser());
            string? sms = null;
            _smsSenderMock
                .Setup(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()))
                .Callback<string, string>((_, message) => sms = message)
                .Returns(Task.CompletedTask);

            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Phone });

            // Assert: the 6-digit code reaches the phone but not the API response
            var code = System.Text.RegularExpressions.Regex.Match(sms!, @"\d{6}").Value;
            code.Should().HaveLength(6);
            System.Text.Json.JsonSerializer.Serialize(result).Should().NotContain(code);
        }

        [Fact]
        public async Task ForgotPasswordAsync_WithSpacesAroundEmail_ShouldTrim()
        {
            // Arrange
            SetupFindByEmail(ActiveUser());

            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = $"  {Email}  " });

            // Assert
            result.Success.Should().BeTrue();
            _emailSenderMock.Verify(e => e.SendEmailAsync(Email, It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        }

        [Theory]
        [InlineData("abc123")]
        [InlineData("091234567")]
        [InlineData("0112345678")]
        public async Task ForgotPasswordAsync_WithInvalidPhone_ShouldFailWithoutQueryingDatabase(string phone)
        {
            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = phone });

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidPhone);
            _registrationRepositoryMock.Verify(r => r.FindUserByPhoneAsync(It.IsAny<IReadOnlyCollection<string>>()), Times.Never);
            _smsSenderMock.Verify(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
            _passwordResetStoreMock.Verify(s => s.Save(It.IsAny<PasswordResetSession>(), It.IsAny<TimeSpan>()), Times.Never);
        }

        [Fact]
        public async Task ForgotPasswordAsync_WhenEmailNotFound_ShouldAnswerLikeAnyAccountWithoutSending()
        {
            // Arrange
            SetupFindByEmail(null);

            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Email });

            // Assert
            // The same answer as for a real account, so the endpoint does not tell which accounts exist
            result.Success.Should().BeTrue();
            result.Data!.SessionId.Should().NotBeNullOrEmpty();
            VerifyNothingSentAndNoSessionSaved();
        }

        [Fact]
        public async Task ForgotPasswordAsync_WhenPhoneNotFound_ShouldAnswerLikeAnyAccountWithoutSending()
        {
            // Arrange
            SetupFindByPhone(null);

            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Phone });

            // Assert
            // The same answer as for a real account, so the endpoint does not tell which accounts exist
            result.Success.Should().BeTrue();
            result.Data!.SessionId.Should().NotBeNullOrEmpty();
            VerifyNothingSentAndNoSessionSaved();
        }

        [Fact]
        public async Task ForgotPasswordAsync_WhenRegistrationNotVerified_ShouldAnswerLikeAnyAccountWithoutSending()
        {
            // Arrange: a patient who never finished OTP registration has no password to recover
            var user = PendingRegistrationUser();
            SetupFindByEmail(user);
            _userManagerMock.Setup(m => m.IsInRoleAsync(user, RoleConstants.PatientRole)).ReturnsAsync(true);

            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Email });

            // Assert
            // The same answer as for a real account, so the endpoint does not tell which accounts exist
            result.Success.Should().BeTrue();
            result.Data!.SessionId.Should().NotBeNullOrEmpty();
            VerifyNothingSentAndNoSessionSaved();
        }

        [Fact]
        public async Task ForgotPasswordAsync_WhenSmsFails_ShouldFailWithoutSavingSession()
        {
            // Arrange
            SetupFindByPhone(ActiveUser());
            _smsSenderMock
                .Setup(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()))
                .ThrowsAsync(new Exception("SMS gateway down"));

            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Phone });

            // Assert: a session nobody received a code for must not exist
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpSendFailed);
            _passwordResetStoreMock.Verify(s => s.Save(It.IsAny<PasswordResetSession>(), It.IsAny<TimeSpan>()), Times.Never);
        }

        [Fact]
        public async Task ForgotPasswordAsync_WhenEmailFails_ShouldFailWithoutSavingSession()
        {
            // Arrange
            SetupFindByEmail(ActiveUser());
            _emailSenderMock
                .Setup(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .ThrowsAsync(new Exception("Mail server down"));

            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Email });

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpSendFailed);
            _passwordResetStoreMock.Verify(s => s.Save(It.IsAny<PasswordResetSession>(), It.IsAny<TimeSpan>()), Times.Never);
        }
    }
}
