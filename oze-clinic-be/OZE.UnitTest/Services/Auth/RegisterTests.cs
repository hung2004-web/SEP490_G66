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
    // OZ-AUTH-01 Register
    [Trait("Tab", "OZ-AUTH-01")]
    public class RegisterTests : AuthServiceTestBase
    {
        [Fact]
        public async Task RegisterAsync_WithNewPhone_ShouldCreateLockedPatientAccountAndSendSms()
        {
            // Arrange
            SetupFindByPhone(null);
            SetupIdentityWritesSucceed();
            ApplicationUser? created = null;
            _userManagerMock
                .Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>()))
                .Callback<ApplicationUser>(u => created = u)
                .ReturnsAsync(IdentityResult.Success);

            // Act
            var result = await _authService.RegisterAsync(ValidRegisterRequest(), BaseUrl);

            // Assert: the account exists but cannot sign in until the OTP is entered
            result.Success.Should().BeTrue();
            created.Should().NotBeNull();
            created!.UserName.Should().Be(NormalizedPhone);
            created.PhoneNumber.Should().Be(NormalizedPhone);
            created.PhoneNumberConfirmed.Should().BeFalse();
            created.LockoutEnd.Should().Be(DateTimeOffset.MaxValue);
            created.PasswordHash.Should().NotBeNullOrEmpty().And.NotBe(RegisterPassword);
            _userManagerMock.Verify(m => m.AddToRoleAsync(created, RoleConstants.PatientRole), Times.Once);
            _smsSenderMock.Verify(s => s.SendSmsAsync(NormalizedPhone, It.IsAny<string>()), Times.Once);
        }

        [Fact]
        public async Task RegisterAsync_WhenSuccessful_ShouldSavePendingSessionAndReturnIt()
        {
            // Arrange
            SetupFindByPhone(null);
            SetupIdentityWritesSucceed();
            PendingRegistration? saved = null;
            _pendingStoreMock
                .Setup(s => s.Save(It.IsAny<PendingRegistration>(), It.IsAny<TimeSpan>()))
                .Callback<PendingRegistration, TimeSpan>((pending, _) => saved = pending);

            // Act
            var result = await _authService.RegisterAsync(ValidRegisterRequest(), BaseUrl);

            // Assert: the session keeps the profile until the OTP is verified
            saved.Should().NotBeNull();
            saved!.FullName.Should().Be("Nguyen Van A");
            saved.PhoneNumber.Should().Be(NormalizedPhone);
            saved.VerificationMethod.Should().Be(VerificationMethodConstants.Sms);
            saved.FailedAttempts.Should().Be(0);
            saved.OtpHash.Should().NotBeNullOrEmpty();
            result.Data!.SessionId.Should().Be(saved.SessionId);
            result.Data.MaskedDestination.Should().Contain("*");
        }

        [Fact]
        public async Task RegisterAsync_WithEmailMethod_ShouldSendCodeByEmailOnly()
        {
            // Arrange
            SetupFindByPhone(null);
            SetupFindByEmail(null);
            SetupIdentityWritesSucceed();

            // Act
            var result = await _authService.RegisterAsync(ValidRegisterRequest(VerificationMethodConstants.Email), BaseUrl);

            // Assert
            result.Success.Should().BeTrue();
            _emailSenderMock.Verify(e => e.SendRegistrationOtpAsync(Email, "Nguyen Van A", It.IsAny<string>(), It.IsAny<int>()), Times.Once);
            _smsSenderMock.Verify(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task RegisterAsync_WhenPhoneHasUnfinishedSignUp_ShouldReuseThatAccount()
        {
            // Arrange: the guest registered before but never entered the OTP
            var unfinished = PendingRegistrationUser();
            SetupFindByPhone(unfinished);
            _userManagerMock.Setup(m => m.IsInRoleAsync(unfinished, RoleConstants.PatientRole)).ReturnsAsync(true);
            SetupIdentityWritesSucceed();
            var oldStamp = unfinished.SecurityStamp;

            // Act
            var result = await _authService.RegisterAsync(ValidRegisterRequest(), BaseUrl);

            // Assert: the same account is updated, and old OTP sessions stop working
            result.Success.Should().BeTrue();
            _userManagerMock.Verify(m => m.UpdateAsync(unfinished), Times.Once);
            _userManagerMock.Verify(m => m.CreateAsync(It.IsAny<ApplicationUser>()), Times.Never);
            unfinished.SecurityStamp.Should().NotBe(oldStamp);
        }

        [Fact]
        public async Task RegisterAsync_WhenPhoneAlreadyHasAccount_ShouldFail()
        {
            // Arrange
            SetupFindByPhone(ActiveUser());

            // Act
            var result = await _authService.RegisterAsync(ValidRegisterRequest(), BaseUrl);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(string.Format(ErrorConstants.AuthMessage.PhoneExist, Phone));
            VerifyNoAccountSaved();
            VerifyNoOtpSentAndNoPendingSaved();
        }

        [Fact]
        public async Task RegisterAsync_WhenEmailBelongsToAnotherAccount_ShouldFail()
        {
            // Arrange
            SetupFindByPhone(null);
            SetupFindByEmail(new ApplicationUser { Id = "someone-else", Email = Email });

            // Act
            var result = await _authService.RegisterAsync(ValidRegisterRequest(VerificationMethodConstants.Email), BaseUrl);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.EmailExist);
            VerifyNoAccountSaved();
        }

        [Theory]
        [InlineData("abc123")]
        [InlineData("091234567")]
        [InlineData("0112345678")]
        public async Task RegisterAsync_WithInvalidPhone_ShouldFail(string phone)
        {
            // Arrange
            var request = ValidRegisterRequest();
            request.PhoneNumber = phone;

            // Act
            var result = await _authService.RegisterAsync(request, BaseUrl);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidPhone);
            VerifyNoAccountSaved();
        }

        [Fact]
        public async Task RegisterAsync_WithDateOfBirthInTheFuture_ShouldFail()
        {
            // Arrange: tomorrow in Vietnam time
            var request = ValidRegisterRequest();
            request.DateOfBirth = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7)).AddDays(1);

            // Act
            var result = await _authService.RegisterAsync(request, BaseUrl);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.DateOfBirthInvalid);
            VerifyNoAccountSaved();
        }

        [Fact]
        public async Task RegisterAsync_WithDateOfBirthToday_ShouldBeAccepted()
        {
            // Arrange: a baby born today in Vietnam time is a valid patient
            var request = ValidRegisterRequest();
            request.DateOfBirth = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
            SetupFindByPhone(null);
            SetupIdentityWritesSucceed();

            // Act
            var result = await _authService.RegisterAsync(request, BaseUrl);

            // Assert
            result.Success.Should().BeTrue();
        }

        [Theory]
        [InlineData("not-an-email")]
        [InlineData("a@")]
        public async Task RegisterAsync_WithInvalidEmail_ShouldFail(string email)
        {
            // Arrange
            var request = ValidRegisterRequest();
            request.Email = email;

            // Act
            var result = await _authService.RegisterAsync(request, BaseUrl);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.EmailInvalid);
        }

        [Fact]
        public async Task RegisterAsync_WithEmailMethodButNoEmail_ShouldFail()
        {
            // Arrange
            var request = ValidRegisterRequest(VerificationMethodConstants.Email);
            request.Email = "   ";

            // Act
            var result = await _authService.RegisterAsync(request, BaseUrl);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.EmailRequired);
        }

        [Fact]
        public async Task RegisterAsync_WhenIdentityRejectsAccount_ShouldFailWithoutSendingOtp()
        {
            // Arrange
            SetupFindByPhone(null);
            SetupIdentityWritesSucceed();
            _userManagerMock
                .Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>()))
                .ReturnsAsync(IdentityResult.Failed(new IdentityError { Code = "DuplicateUserName", Description = "User name is taken." }));

            // Act
            var result = await _authService.RegisterAsync(ValidRegisterRequest(), BaseUrl);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be("User registration failed");
            result.Errors.Should().Contain("User name is taken.");
            VerifyNoOtpSentAndNoPendingSaved();
        }

        [Fact]
        public async Task RegisterAsync_WhenSmsFails_ShouldFailWithoutSavingSession()
        {
            // Arrange
            SetupFindByPhone(null);
            SetupIdentityWritesSucceed();
            _smsSenderMock
                .Setup(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()))
                .ThrowsAsync(new Exception("SMS gateway down"));

            // Act
            var result = await _authService.RegisterAsync(ValidRegisterRequest(), BaseUrl);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpSendFailed);
            _pendingStoreMock.Verify(s => s.Save(It.IsAny<PendingRegistration>(), It.IsAny<TimeSpan>()), Times.Never);
        }

        [Fact]
        public async Task Registration_RegisterThenVerifySmsCode_ShouldActivateAccount()
        {
            // Arrange: a store and a user store that really keep data between the two calls
            var sessions = new Dictionary<string, PendingRegistration>();
            _pendingStoreMock
                .Setup(s => s.Save(It.IsAny<PendingRegistration>(), It.IsAny<TimeSpan>()))
                .Callback<PendingRegistration, TimeSpan>((pending, _) => sessions[pending.SessionId] = pending);
            _pendingStoreMock.Setup(s => s.Get(It.IsAny<string>())).Returns<string>(id => sessions.GetValueOrDefault(id));
            _pendingStoreMock.Setup(s => s.Remove(It.IsAny<string>())).Callback<string>(id => sessions.Remove(id));

            ApplicationUser? account = null;
            SetupFindByPhone(null);
            SetupIdentityWritesSucceed();
            _userManagerMock
                .Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>()))
                .Callback<ApplicationUser>(u => account = u)
                .ReturnsAsync(IdentityResult.Success);
            _userManagerMock.Setup(m => m.FindByIdAsync(It.IsAny<string>())).ReturnsAsync(() => account);
            // The role is added during registration, so the account counts as a pending patient afterwards
            _userManagerMock
                .Setup(m => m.IsInRoleAsync(It.IsAny<ApplicationUser>(), RoleConstants.PatientRole))
                .ReturnsAsync(() => account != null);
            SetupWalkInPatients();

            string? sms = null;
            _smsSenderMock
                .Setup(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()))
                .Callback<string, string>((_, message) => sms = message)
                .Returns(Task.CompletedTask);

            // Act 1: sign up
            var register = await _authService.RegisterAsync(ValidRegisterRequest(), BaseUrl);
            var codeFromSms = System.Text.RegularExpressions.Regex.Match(sms!, @"\d{6}").Value;

            // Act 2: type the code from the SMS
            var verify = await _authService.VerifyOtpAsync(
                new VerifyOtpRequest { SessionId = register.Data!.SessionId, Otp = codeFromSms }, BaseUrl);

            // Assert
            register.Success.Should().BeTrue();
            verify.Success.Should().BeTrue();
            account!.PhoneNumberConfirmed.Should().BeTrue();
            account.LockoutEnd.Should().BeNull();
            account.Patient.Should().NotBeNull();
            sessions.Should().BeEmpty();
        }
    }
}
