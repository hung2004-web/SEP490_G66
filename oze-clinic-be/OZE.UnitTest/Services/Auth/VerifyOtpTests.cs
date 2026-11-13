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
    // OZ-AUTH-02 VerifyOtp
    [Trait("Tab", "OZ-AUTH-02")]
    public class VerifyOtpTests : AuthServiceTestBase
    {
        [Fact]
        public async Task VerifyOtpAsync_WithCorrectSmsCode_ShouldActivateAccountAndCreatePatient()
        {
            // Arrange
            var account = UnverifiedAccount();
            SetupPending(NewPending());
            SetupUnverifiedAccount(account);
            SetupWalkInPatients();
            SetupIdentityWritesSucceed();

            // Act
            var result = await _authService.VerifyOtpAsync(RegisterOtpRequest(CorrectOtp), BaseUrl);

            // Assert: the phone is verified, the account unlocked and a patient record created
            result.Success.Should().BeTrue();
            result.Message.Should().Be(ErrorConstants.AuthMessage.AccountCreated);
            account.PhoneNumberConfirmed.Should().BeTrue();
            account.LockoutEnd.Should().BeNull();
            account.Patient.Should().NotBeNull();
            account.Patient!.FullName.Should().Be("Nguyen Van A");
            account.Patient.PhoneNumber.Should().Be(NormalizedPhone);
            _userManagerMock.Verify(m => m.UpdateAsync(account), Times.Once);
            _pendingStoreMock.Verify(s => s.Remove(RegisterSessionId), Times.Once);
        }

        [Fact]
        public async Task VerifyOtpAsync_WithSmsCodeAndWalkInRecord_ShouldLinkExistingPatient()
        {
            // Arrange: the reception desk already created a record for this phone
            var account = UnverifiedAccount();
            var walkIn = new Patient { Id = 7, FullName = "Nguyen Van A", PhoneNumber = "0912345678" };
            SetupPending(NewPending());
            SetupUnverifiedAccount(account);
            SetupWalkInPatients(walkIn);
            SetupIdentityWritesSucceed();

            // Act
            var result = await _authService.VerifyOtpAsync(RegisterOtpRequest(CorrectOtp), BaseUrl);

            // Assert: the old record is reused instead of creating a duplicate
            result.Success.Should().BeTrue();
            walkIn.UserId.Should().Be(account.Id);
            walkIn.DateOfBirth.Should().Be(new DateOnly(2000, 1, 15));
            account.Patient.Should().BeNull();
        }

        [Fact]
        public async Task VerifyOtpAsync_WithSmsCodeAndSeveralWalkInRecords_ShouldAskForReceptionDesk()
        {
            // Arrange
            var account = UnverifiedAccount();
            SetupPending(NewPending());
            SetupUnverifiedAccount(account);
            SetupWalkInPatients(new Patient { Id = 7 }, new Patient { Id = 8 });
            SetupIdentityWritesSucceed();

            // Act
            var result = await _authService.VerifyOtpAsync(RegisterOtpRequest(CorrectOtp), BaseUrl);

            // Assert: the system cannot guess which record is theirs
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.MultiplePatientRecords);
            account.LockoutEnd.Should().Be(DateTimeOffset.MaxValue);
            _userManagerMock.Verify(m => m.UpdateAsync(It.IsAny<ApplicationUser>()), Times.Never);
        }

        [Fact]
        public async Task VerifyOtpAsync_WithEmailCode_ShouldConfirmEmailButNotLinkWalkInRecord()
        {
            // Arrange: the phone was not verified, so a matching walk-in record is left for the reception desk
            var account = UnverifiedAccount();
            var walkIn = new Patient { Id = 7, FullName = "Nguyen Van A" };
            SetupPending(NewPending(VerificationMethodConstants.Email));
            SetupUnverifiedAccount(account);
            SetupWalkInPatients(walkIn);
            SetupIdentityWritesSucceed();

            // Act
            var result = await _authService.VerifyOtpAsync(RegisterOtpRequest(CorrectOtp), BaseUrl);

            // Assert
            result.Success.Should().BeTrue();
            account.EmailConfirmed.Should().BeTrue();
            account.PhoneNumberConfirmed.Should().BeFalse();
            walkIn.UserId.Should().BeNull();
            account.Patient.Should().BeNull();
        }

        [Fact]
        public async Task VerifyOtpAsync_WithSmsCodeAndEmail_ShouldSendEmailConfirmationLink()
        {
            // Arrange: the patient verified by SMS but also gave an email
            var account = UnverifiedAccount();
            account.Email = Email;
            SetupPending(NewPending());
            SetupUnverifiedAccount(account);
            SetupWalkInPatients();
            SetupIdentityWritesSucceed();
            _userManagerMock.Setup(m => m.GenerateEmailConfirmationTokenAsync(account)).ReturnsAsync(RawEmailToken);

            // Act
            await _authService.VerifyOtpAsync(RegisterOtpRequest(CorrectOtp), BaseUrl);

            // Assert: the link points to our API and carries the encoded token
            _emailSenderMock.Verify(e => e.SendEmailVerificationAsync(
                account,
                It.Is<string>(url => url.StartsWith($"{BaseUrl}/api/auth/confirm-email?userId={account.Id}")
                    && url.Contains(EncodeForLink(RawEmailToken)))),
                Times.Once);
        }

        [Fact]
        public async Task VerifyOtpAsync_WhenConfirmationEmailFails_ShouldStillSucceed()
        {
            // Arrange
            var account = UnverifiedAccount();
            account.Email = Email;
            SetupPending(NewPending());
            SetupUnverifiedAccount(account);
            SetupWalkInPatients();
            SetupIdentityWritesSucceed();
            _userManagerMock.Setup(m => m.GenerateEmailConfirmationTokenAsync(account)).ReturnsAsync(RawEmailToken);
            _emailSenderMock
                .Setup(e => e.SendEmailVerificationAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>()))
                .ThrowsAsync(new Exception("Mail server down"));

            // Act
            var result = await _authService.VerifyOtpAsync(RegisterOtpRequest(CorrectOtp), BaseUrl);

            // Assert: the account is already active, an email problem must not undo that
            result.Success.Should().BeTrue();
        }

        [Fact]
        public async Task VerifyOtpAsync_WithWrongCode_ShouldCountFailedAttempt()
        {
            // Arrange
            var pending = NewPending();
            SetupPending(pending);

            // Act
            var result = await _authService.VerifyOtpAsync(RegisterOtpRequest(WrongOtp), BaseUrl);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidOtp);
            pending.FailedAttempts.Should().Be(1);
            _pendingStoreMock.Verify(s => s.Save(pending, It.IsAny<TimeSpan>()), Times.Once);
            _userManagerMock.Verify(m => m.UpdateAsync(It.IsAny<ApplicationUser>()), Times.Never);
        }

        [Fact]
        public async Task VerifyOtpAsync_WithWrongCodeOnLastAttempt_ShouldDeleteSession()
        {
            // Arrange
            SetupPending(NewPending(failedAttempts: MaxOtpAttempts - 1));

            // Act
            var result = await _authService.VerifyOtpAsync(RegisterOtpRequest(WrongOtp), BaseUrl);

            // Assert
            result.Success.Should().BeFalse();
            _pendingStoreMock.Verify(s => s.Remove(RegisterSessionId), Times.Once);
            _pendingStoreMock.Verify(s => s.Save(It.IsAny<PendingRegistration>(), It.IsAny<TimeSpan>()), Times.Never);
        }

        [Fact]
        public async Task VerifyOtpAsync_AfterTooManyWrongAttempts_ShouldRejectEvenCorrectCode()
        {
            // Arrange
            SetupPending(NewPending(failedAttempts: MaxOtpAttempts));

            // Act
            var result = await _authService.VerifyOtpAsync(RegisterOtpRequest(CorrectOtp), BaseUrl);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidOtp);
            _pendingStoreMock.Verify(s => s.Remove(RegisterSessionId), Times.Once);
            _userManagerMock.Verify(m => m.UpdateAsync(It.IsAny<ApplicationUser>()), Times.Never);
        }

        [Fact]
        public async Task VerifyOtpAsync_WhenSessionNotFoundOrExpired_ShouldFail()
        {
            // Arrange
            SetupPending(NewPending(expiresInMinutes: -1));

            // Act
            var result = await _authService.VerifyOtpAsync(RegisterOtpRequest(CorrectOtp), BaseUrl);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpExpired);
        }

        [Fact]
        public async Task VerifyOtpAsync_WhenAccountAlreadyActivated_ShouldNotActivateAgain()
        {
            // Arrange: the same code is used twice, the account is no longer pending
            var account = UnverifiedAccount();
            account.PhoneNumberConfirmed = true;
            account.LockoutEnd = null;
            SetupPending(NewPending());
            SetupUnverifiedAccount(account);

            // Act
            var result = await _authService.VerifyOtpAsync(RegisterOtpRequest(CorrectOtp), BaseUrl);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpExpired);
            _pendingStoreMock.Verify(s => s.Remove(RegisterSessionId), Times.Once);
            _userManagerMock.Verify(m => m.UpdateAsync(It.IsAny<ApplicationUser>()), Times.Never);
        }

        [Fact]
        public async Task VerifyOtpAsync_WhenSavingAccountFails_ShouldReturnIdentityErrors()
        {
            // Arrange
            var account = UnverifiedAccount();
            SetupPending(NewPending());
            SetupUnverifiedAccount(account);
            SetupWalkInPatients();
            _userManagerMock
                .Setup(m => m.UpdateAsync(account))
                .ReturnsAsync(IdentityResult.Failed(new IdentityError { Code = "ConcurrencyFailure", Description = "Optimistic concurrency failure." }));

            // Act
            var result = await _authService.VerifyOtpAsync(RegisterOtpRequest(CorrectOtp), BaseUrl);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be("User registration failed");
            result.Errors.Should().Contain("Optimistic concurrency failure.");
        }
    }
}
