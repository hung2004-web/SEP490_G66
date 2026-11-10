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
    // OZ-ME-04 VerifyPhoneOtp
    [Trait("Tab", "OZ-ME-04")]
    public class VerifyPhoneOtpTests : UserServiceTestBase
    {
        // UTCID01 (A): the OTP session does not exist
        [Fact]
        public async Task VerifyPhoneOtpAsync_SessionNotFound_ReturnsOtpExpired()
        {
            _pendingProfileUpdateStoreMock.Setup(s => s.Get(SessionId)).Returns((PendingProfileUpdate?)null);

            var result = await _userService.VerifyPhoneOtpAsync(UserId, VerifyRequest(Otp), BaseUrl);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ProfileMessage.OtpExpired);
        }

        // UTCID02 (A): the session belongs to another account, so it is treated as expired
        [Fact]
        public async Task VerifyPhoneOtpAsync_SessionOfAnotherUser_ReturnsOtpExpired()
        {
            ArrangePendingUpdate(p => p.UserId = "other-user");

            var result = await _userService.VerifyPhoneOtpAsync(UserId, VerifyRequest(Otp), BaseUrl);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ProfileMessage.OtpExpired);
        }

        // UTCID03 (B): the session expired one second ago
        [Fact]
        public async Task VerifyPhoneOtpAsync_SessionExpired_ReturnsOtpExpired()
        {
            ArrangePendingUpdate(p => p.ExpiresAt = DateTime.UtcNow.AddSeconds(-1));

            var result = await _userService.VerifyPhoneOtpAsync(UserId, VerifyRequest(Otp), BaseUrl);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ProfileMessage.OtpExpired);
        }

        // UTCID04 (A): a wrong OTP counts one failed attempt and keeps the session
        [Fact]
        public async Task VerifyPhoneOtpAsync_WrongOtp_CountsFailedAttempt()
        {
            var update = ArrangePendingUpdate();

            var result = await _userService.VerifyPhoneOtpAsync(UserId, VerifyRequest("000000"), BaseUrl);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidOtp);
            update.FailedAttempts.Should().Be(1);
            _pendingProfileUpdateStoreMock.Verify(s => s.Save(update, It.IsAny<TimeSpan>()), Times.Once);
            _pendingProfileUpdateStoreMock.Verify(s => s.Remove(It.IsAny<string>()), Times.Never);
        }

        // UTCID05 (B): the 5th wrong OTP (MaxAttempts = 5) ends the session
        [Fact]
        public async Task VerifyPhoneOtpAsync_FifthWrongOtp_RemovesSession()
        {
            var update = ArrangePendingUpdate(p => p.FailedAttempts = 4);

            var result = await _userService.VerifyPhoneOtpAsync(UserId, VerifyRequest("000000"), BaseUrl);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidOtp);
            update.FailedAttempts.Should().Be(5);
            _pendingProfileUpdateStoreMock.Verify(s => s.Remove(SessionId), Times.Once);
        }

        // UTCID06 (B): after 5 failed attempts even the correct OTP is refused
        [Fact]
        public async Task VerifyPhoneOtpAsync_AttemptsUsedUp_RejectsCorrectOtp()
        {
            ArrangePendingUpdate(p => p.FailedAttempts = 5);

            var result = await _userService.VerifyPhoneOtpAsync(UserId, VerifyRequest(Otp), BaseUrl);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidOtp);
            _pendingProfileUpdateStoreMock.Verify(s => s.Remove(SessionId), Times.Once);
            _userManagerMock.Verify(m => m.UpdateAsync(It.IsAny<ApplicationUser>()), Times.Never);
        }

        // UTCID07 (A): the password or contact changed after the OTP was sent (security stamp differs)
        [Fact]
        public async Task VerifyPhoneOtpAsync_SecurityStampChanged_ReturnsOtpExpired()
        {
            var (user, _) = ArrangeUserAndPatient();
            ArrangePendingUpdate();
            user.SecurityStamp = "stamp-changed";

            var result = await _userService.VerifyPhoneOtpAsync(UserId, VerifyRequest(Otp), BaseUrl);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ProfileMessage.OtpExpired);
        }

        // UTCID08 (A): the profile was saved again while the OTP was pending
        [Fact]
        public async Task VerifyPhoneOtpAsync_ProfileChangedMeanwhile_ReturnsProfileChangedMeanwhile()
        {
            var (_, patient) = ArrangeUserAndPatient();
            ArrangePendingUpdate();
            patient.UpdatedAt = PatientUpdatedAt.AddMinutes(1);

            var result = await _userService.VerifyPhoneOtpAsync(UserId, VerifyRequest(Otp), BaseUrl);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ProfileMessage.ProfileChangedMeanwhile);
        }

        // UTCID09 (A): another account took the new phone number while the OTP was pending
        [Fact]
        public async Task VerifyPhoneOtpAsync_PhoneTakenMeanwhile_ReturnsPhoneExist()
        {
            ArrangeUserAndPatient();
            ArrangePendingUpdate();
            _patientRepositoryMock
                .Setup(r => r.IsPhoneInUseAsync(It.IsAny<IReadOnlyCollection<string>>(), PatientId))
                .ReturnsAsync(true);

            var result = await _userService.VerifyPhoneOtpAsync(UserId, VerifyRequest(Otp), BaseUrl);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(string.Format(ErrorConstants.AuthMessage.PhoneExist, NewPhone));
        }

        // UTCID10 (N): the correct OTP saves the new phone number as confirmed
        [Fact]
        public async Task VerifyPhoneOtpAsync_CorrectOtp_SavesNewPhone()
        {
            var (user, patient) = ArrangeUserAndPatient();
            ArrangePendingUpdate();

            var result = await _userService.VerifyPhoneOtpAsync(UserId, VerifyRequest($" {Otp} "), BaseUrl);

            result.Success.Should().BeTrue();
            result.Message.Should().Be(ErrorConstants.ProfileMessage.ProfileUpdated);
            result.Data!.PhoneNumber.Should().Be(NewPhone);
            user.PhoneNumber.Should().Be(NewPhone);
            user.PhoneNumberConfirmed.Should().BeTrue();
            user.SecurityStamp.Should().NotBe(SecurityStamp);
            patient.PhoneNumber.Should().Be(NewPhone);
            _pendingProfileUpdateStoreMock.Verify(s => s.Remove(SessionId), Times.Once);
        }
    }
}
