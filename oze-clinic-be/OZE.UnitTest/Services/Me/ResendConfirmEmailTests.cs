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
    // OZ-ME-03 ResendConfirmEmail
    [Trait("Tab", "OZ-ME-03")]
    public class ResendConfirmEmailTests : UserServiceTestBase
    {
        // UTCID01 (A): the account does not exist
        [Fact]
        public async Task ResendEmailConfirmationAsync_UserNotFound_ReturnsNoEmailToConfirm()
        {
            _userManagerMock.Setup(m => m.FindByIdAsync(UserId)).ReturnsAsync((ApplicationUser?)null);

            var result = await _userService.ResendEmailConfirmationAsync(UserId, BaseUrl);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ProfileMessage.NoEmailToConfirm);
        }

        // UTCID02 (A): the account has no email
        [Fact]
        public async Task ResendEmailConfirmationAsync_NoEmail_ReturnsNoEmailToConfirm()
        {
            var user = NewUser();
            user.Email = null;
            _userManagerMock.Setup(m => m.FindByIdAsync(UserId)).ReturnsAsync(user);

            var result = await _userService.ResendEmailConfirmationAsync(UserId, BaseUrl);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ProfileMessage.NoEmailToConfirm);
        }

        // UTCID03 (A): the email is already confirmed
        [Fact]
        public async Task ResendEmailConfirmationAsync_EmailAlreadyConfirmed_ReturnsNoEmailToConfirm()
        {
            var user = NewUser();
            user.EmailConfirmed = true;
            _userManagerMock.Setup(m => m.FindByIdAsync(UserId)).ReturnsAsync(user);

            var result = await _userService.ResendEmailConfirmationAsync(UserId, BaseUrl);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ProfileMessage.NoEmailToConfirm);
            _emailSenderMock.Verify(e => e.SendEmailVerificationAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>()), Times.Never);
        }

        // UTCID04 (N): an unconfirmed email gets a new confirmation link
        [Fact]
        public async Task ResendEmailConfirmationAsync_UnconfirmedEmail_SendsConfirmationLink()
        {
            var user = NewUser();
            _userManagerMock.Setup(m => m.FindByIdAsync(UserId)).ReturnsAsync(user);
            _userManagerMock.Setup(m => m.GenerateEmailConfirmationTokenAsync(user)).ReturnsAsync("token");

            var result = await _userService.ResendEmailConfirmationAsync(UserId, BaseUrl);

            result.Success.Should().BeTrue();
            result.Message.Should().Be(ErrorConstants.ProfileMessage.ConfirmationEmailSent);
            _emailSenderMock.Verify(e => e.SendEmailVerificationAsync(user,
                It.Is<string>(url => url.StartsWith($"{BaseUrl}/api/auth/confirm-email?userId={UserId}&code="))), Times.Once);
        }

        // UTCID05 (A): the mail server fails; the error is logged and the request still succeeds
        [Fact]
        public async Task ResendEmailConfirmationAsync_EmailSenderFails_StillReturnsSuccess()
        {
            var user = NewUser();
            _userManagerMock.Setup(m => m.FindByIdAsync(UserId)).ReturnsAsync(user);
            _userManagerMock.Setup(m => m.GenerateEmailConfirmationTokenAsync(user)).ReturnsAsync("token");
            _emailSenderMock
                .Setup(e => e.SendEmailVerificationAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>()))
                .ThrowsAsync(new Exception("SMTP down"));

            var result = await _userService.ResendEmailConfirmationAsync(UserId, BaseUrl);

            result.Success.Should().BeTrue();
            result.Message.Should().Be(ErrorConstants.ProfileMessage.ConfirmationEmailSent);
        }
    }
}
