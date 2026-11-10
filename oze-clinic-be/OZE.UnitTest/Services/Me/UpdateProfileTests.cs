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
    // OZ-ME-02 UpdateProfile
    [Trait("Tab", "OZ-ME-02")]
    public class UpdateProfileTests : UserServiceTestBase
    {
        // UTCID01 (A): the phone number is not a Vietnamese mobile number
        [Fact]
        public async Task UpdateProfileAsync_InvalidPhone_ReturnsInvalidPhone()
        {
            var result = await _userService.UpdateProfileAsync(UserId, ValidUpdateRequest(phone: "12345"), BaseUrl);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidPhone);
            _userManagerMock.Verify(m => m.FindByIdAsync(It.IsAny<string>()), Times.Never);
        }

        // UTCID02 (B): a date of birth one day after today (clinic time) is rejected
        [Fact]
        public async Task UpdateProfileAsync_DateOfBirthTomorrow_ReturnsDateOfBirthInvalid()
        {
            var tomorrow = ClinicToday().AddDays(1);

            var result = await _userService.UpdateProfileAsync(UserId, ValidUpdateRequest(dateOfBirth: tomorrow), BaseUrl);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.DateOfBirthInvalid);
        }

        // UTCID03 (B): a date of birth equal to today (clinic time) is still accepted
        [Fact]
        public async Task UpdateProfileAsync_DateOfBirthToday_SavesProfile()
        {
            ArrangeUserAndPatient();

            var result = await _userService.UpdateProfileAsync(UserId, ValidUpdateRequest(dateOfBirth: ClinicToday()), BaseUrl);

            result.Success.Should().BeTrue();
            result.Message.Should().Be(ErrorConstants.ProfileMessage.ProfileUpdated);
        }

        // UTCID04 (A): the email has an invalid format
        [Fact]
        public async Task UpdateProfileAsync_InvalidEmail_ReturnsEmailInvalid()
        {
            var result = await _userService.UpdateProfileAsync(UserId, ValidUpdateRequest(email: "not-an-email"), BaseUrl);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.EmailInvalid);
        }

        // UTCID05 (A): the logged-in account no longer exists
        [Fact]
        public async Task UpdateProfileAsync_UserNotFound_ReturnsUserNotFound()
        {
            _userManagerMock.Setup(m => m.FindByIdAsync(UserId)).ReturnsAsync((ApplicationUser?)null);

            var result = await _userService.UpdateProfileAsync(UserId, ValidUpdateRequest(), BaseUrl);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.UserNotFound);
        }

        // UTCID06 (A): the account has no patient record (for example a staff account)
        [Fact]
        public async Task UpdateProfileAsync_PatientNotLinked_ReturnsPatientNotLinked()
        {
            _userManagerMock.Setup(m => m.FindByIdAsync(UserId)).ReturnsAsync(NewUser());
            _patientRepositoryMock.Setup(r => r.GetByUserIdAsync(UserId)).ReturnsAsync((Patient?)null);

            var result = await _userService.UpdateProfileAsync(UserId, ValidUpdateRequest(), BaseUrl);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ProfileMessage.PatientNotLinked);
        }

        // UTCID07 (A): the new phone number already belongs to another account
        [Fact]
        public async Task UpdateProfileAsync_NewPhoneUsedByAnotherAccount_ReturnsPhoneExist()
        {
            ArrangeUserAndPatient();
            _registrationRepositoryMock
                .Setup(r => r.FindUserByPhoneAsync(It.IsAny<IReadOnlyCollection<string>>()))
                .ReturnsAsync(new ApplicationUser { Id = "other-user" });

            var result = await _userService.UpdateProfileAsync(UserId, ValidUpdateRequest(phone: NewPhoneLocal), BaseUrl);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(string.Format(ErrorConstants.AuthMessage.PhoneExist, NewPhone));
            _smsSenderMock.Verify(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        }

        // UTCID08 (A): the new email already belongs to another account
        [Fact]
        public async Task UpdateProfileAsync_NewEmailUsedByAnotherAccount_ReturnsEmailExist()
        {
            ArrangeUserAndPatient();
            _userManagerMock.Setup(m => m.FindByEmailAsync("taken@oze.vn")).ReturnsAsync(new ApplicationUser { Id = "other-user" });

            var result = await _userService.UpdateProfileAsync(UserId, ValidUpdateRequest(email: "taken@oze.vn"), BaseUrl);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.EmailExist);
        }

        // UTCID09 (N): the phone number is unchanged, so the profile is saved at once
        [Fact]
        public async Task UpdateProfileAsync_SamePhone_SavesProfileWithoutOtp()
        {
            var (user, patient) = ArrangeUserAndPatient();

            var result = await _userService.UpdateProfileAsync(UserId, ValidUpdateRequest(fullName: "  Nguyen Van B  ", address: "Da Nang"), BaseUrl);

            result.Success.Should().BeTrue();
            result.Message.Should().Be(ErrorConstants.ProfileMessage.ProfileUpdated);
            result.Data!.OtpRequired.Should().BeFalse();
            result.Data.Profile!.FullName.Should().Be("Nguyen Van B");
            patient.Address.Should().Be("Da Nang");
            _userManagerMock.Verify(m => m.UpdateAsync(user), Times.Once);
            _smsSenderMock.Verify(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        }

        // UTCID10 (N): a new phone number is not saved yet; an OTP is sent to it instead
        [Fact]
        public async Task UpdateProfileAsync_NewPhone_SendsOtpAndKeepsPendingUpdate()
        {
            var (user, _) = ArrangeUserAndPatient();
            PendingProfileUpdate? saved = null;
            _pendingProfileUpdateStoreMock
                .Setup(s => s.Save(It.IsAny<PendingProfileUpdate>(), It.IsAny<TimeSpan>()))
                .Callback<PendingProfileUpdate, TimeSpan>((u, _) => saved = u);

            var result = await _userService.UpdateProfileAsync(UserId, ValidUpdateRequest(phone: NewPhoneLocal), BaseUrl);

            result.Success.Should().BeTrue();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpSentSms);
            result.Data!.OtpRequired.Should().BeTrue();
            result.Data.OtpSession!.MaskedDestination.Should().Be(PhoneNumberHelper.Mask(NewPhone));
            saved.Should().NotBeNull();
            saved!.PhoneNumber.Should().Be(NewPhone);
            user.PhoneNumber.Should().Be(CurrentPhone);
            _smsSenderMock.Verify(s => s.SendSmsAsync(NewPhone, It.IsAny<string>()), Times.Once);
            _userManagerMock.Verify(m => m.UpdateAsync(It.IsAny<ApplicationUser>()), Times.Never);
        }

        // UTCID11 (A): the SMS provider fails, so no OTP session is kept
        [Fact]
        public async Task UpdateProfileAsync_SmsFails_ReturnsOtpSendFailed()
        {
            ArrangeUserAndPatient();
            _smsSenderMock.Setup(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>())).ThrowsAsync(new Exception("SMS down"));

            var result = await _userService.UpdateProfileAsync(UserId, ValidUpdateRequest(phone: NewPhoneLocal), BaseUrl);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpSendFailed);
            _pendingProfileUpdateStoreMock.Verify(s => s.Save(It.IsAny<PendingProfileUpdate>(), It.IsAny<TimeSpan>()), Times.Never);
        }

        // UTCID12 (N): a new email is saved as unconfirmed and a confirmation link is emailed
        [Fact]
        public async Task UpdateProfileAsync_NewEmail_SavesAsUnconfirmedAndSendsConfirmation()
        {
            var (user, _) = ArrangeUserAndPatient();
            _userManagerMock.Setup(m => m.GenerateEmailConfirmationTokenAsync(user)).ReturnsAsync("token");

            var result = await _userService.UpdateProfileAsync(UserId, ValidUpdateRequest(email: "new@oze.vn"), BaseUrl);

            result.Success.Should().BeTrue();
            user.Email.Should().Be("new@oze.vn");
            user.EmailConfirmed.Should().BeFalse();
            _emailSenderMock.Verify(e => e.SendEmailVerificationAsync(user, It.Is<string>(url => url.StartsWith(BaseUrl))), Times.Once);
        }

        // UTCID13 (A): Identity refuses to save the account
        [Fact]
        public async Task UpdateProfileAsync_IdentityUpdateFails_ReturnsUpdateFailed()
        {
            ArrangeUserAndPatient();
            _userManagerMock
                .Setup(m => m.UpdateAsync(It.IsAny<ApplicationUser>()))
                .ReturnsAsync(IdentityResult.Failed(new IdentityError { Description = "Concurrency failure" }));

            var result = await _userService.UpdateProfileAsync(UserId, ValidUpdateRequest(), BaseUrl);

            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ProfileMessage.UpdateFailed);
            result.Errors.Should().Contain("Concurrency failure");
        }
    }
}
