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
    // OZ-ME-05 ResendPhoneOtp
    [Trait("Tab", "OZ-ME-05")]
    public class ResendPhoneOtpTests : UserServiceTestBase
    {
        // UTCID01 (A): the OTP session does not exist
        [Fact]
        public async Task ResendPhoneOtpAsync_SessionNotFound_ReturnsOtpExpired()
        {
            _pendingProfileUpdateStoreMock.Setup(s => s.Get(SessionId)).Returns((PendingProfileUpdate?)null);

            var result = await _userService.ResendPhoneOtpAsync(UserId, new ResendOtpRequest { SessionId = SessionId });

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ProfileMessage.OtpExpired);
        }

        // UTCID02 (B): asking again 59 seconds after the last code (cooldown 60 s) is too soon
        [Fact]
        public async Task ResendPhoneOtpAsync_BeforeCooldown_ReturnsOtpResendTooSoon()
        {
            ArrangePendingUpdate(p => p.LastSentAt = DateTime.UtcNow.AddSeconds(-59));

            var result = await _userService.ResendPhoneOtpAsync(UserId, new ResendOtpRequest { SessionId = SessionId });

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpResendTooSoon);
            _smsSenderMock.Verify(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        }

        // UTCID03 (A): the security stamp changed, so the session is ended
        [Fact]
        public async Task ResendPhoneOtpAsync_SecurityStampChanged_RemovesSession()
        {
            var (user, _) = ArrangeUserAndPatient();
            ArrangePendingUpdate();
            user.SecurityStamp = "stamp-changed";

            var result = await _userService.ResendPhoneOtpAsync(UserId, new ResendOtpRequest { SessionId = SessionId });

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ProfileMessage.OtpExpired);
            _pendingProfileUpdateStoreMock.Verify(s => s.Remove(SessionId), Times.Once);
        }

        // UTCID04 (A): the SMS provider fails; the previous OTP stays valid
        [Fact]
        public async Task ResendPhoneOtpAsync_SmsFails_KeepsPreviousOtp()
        {
            ArrangeUserAndPatient();
            var update = ArrangePendingUpdate();
            var previousHash = update.OtpHash;
            _smsSenderMock.Setup(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>())).ThrowsAsync(new Exception("SMS down"));

            var result = await _userService.ResendPhoneOtpAsync(UserId, new ResendOtpRequest { SessionId = SessionId });

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpSendFailed);
            update.OtpHash.Should().Be(previousHash);
            _pendingProfileUpdateStoreMock.Verify(s => s.Save(It.IsAny<PendingProfileUpdate>(), It.IsAny<TimeSpan>()), Times.Never);
        }

        // UTCID05 (N): a new code is sent, the failed attempts reset and the session is extended
        [Fact]
        public async Task ResendPhoneOtpAsync_AfterCooldown_SendsNewOtp()
        {
            ArrangeUserAndPatient();
            var update = ArrangePendingUpdate(p => p.FailedAttempts = 3);
            var previousHash = update.OtpHash;

            var result = await _userService.ResendPhoneOtpAsync(UserId, new ResendOtpRequest { SessionId = SessionId });

            result.Success.Should().BeTrue();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpSentSms);
            result.Data!.MaskedDestination.Should().Be(PhoneNumberHelper.Mask(NewPhone));
            update.FailedAttempts.Should().Be(0);
            update.OtpHash.Should().NotBe(previousHash);
            update.ExpiresAt.Should().BeAfter(DateTime.UtcNow.AddMinutes(4));
            _smsSenderMock.Verify(s => s.SendSmsAsync(NewPhone, It.IsAny<string>()), Times.Once);
            _pendingProfileUpdateStoreMock.Verify(s => s.Save(update, It.IsAny<TimeSpan>()), Times.Once);
        }
    }
}
