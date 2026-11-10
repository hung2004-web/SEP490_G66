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
    // OZ-AUTH-08 ConfirmEmail
    [Trait("Tab", "OZ-AUTH-08")]
    public class ConfirmEmailTests : AuthServiceTestBase
    {
        [Fact]
        public async Task ConfirmEmailAsync_WithValidCode_ShouldConfirmEmail()
        {
            // Arrange
            var user = ActiveUser();
            SetupFindById(user);
            _userManagerMock.Setup(m => m.ConfirmEmailAsync(user, RawEmailToken)).ReturnsAsync(IdentityResult.Success);

            // Act
            var result = await _authService.ConfirmEmailAsync(UserId, EncodeForLink(RawEmailToken));

            // Assert: the code from the link is decoded before it reaches Identity
            result.Success.Should().BeTrue();
            _userManagerMock.Verify(m => m.ConfirmEmailAsync(user, RawEmailToken), Times.Once);
        }

        [Fact]
        public async Task ConfirmEmailAsync_WhenUserNotFound_ShouldFail()
        {
            // Arrange
            SetupFindById(null);

            // Act
            var result = await _authService.ConfirmEmailAsync(UserId, EncodeForLink(RawEmailToken));

            // Assert
            // The same answer as a bad code, so the link does not tell which accounts exist
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidConfirmationLink);
            _userManagerMock.Verify(m => m.ConfirmEmailAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task ConfirmEmailAsync_WhenIdentityRejectsCode_ShouldReturnIdentityErrors()
        {
            // Arrange: the code is well formed but wrong or already used
            var user = ActiveUser();
            SetupFindById(user);
            _userManagerMock
                .Setup(m => m.ConfirmEmailAsync(user, RawEmailToken))
                .ReturnsAsync(IdentityResult.Failed(new IdentityError { Code = "InvalidToken", Description = "Invalid token." }));

            // Act
            var result = await _authService.ConfirmEmailAsync(UserId, EncodeForLink(RawEmailToken));

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be("Email confirmation failed");
            result.Errors.Should().Contain("Invalid token.");
        }

        [Fact]
        public async Task ConfirmEmailAsync_WithCodeThatCannotBeDecoded_ShouldFailWithoutCrashing()
        {
            // Arrange: a damaged link, e.g. cut off when copied
            SetupFindById(ActiveUser());

            // Act: "a" is not valid Base64Url (a single character cannot be decoded)
            var result = await _authService.ConfirmEmailAsync(UserId, "a");

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidConfirmationLink);
            _userManagerMock.Verify(m => m.ConfirmEmailAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>()), Times.Never);
        }
    }
}
