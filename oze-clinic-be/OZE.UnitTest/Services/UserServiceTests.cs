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

namespace OZE.UnitTest.Services
{
    public class UserServiceTests
    {
        private const string UserId = "user-1";
        private const string Email = "patient@oze.vn";
        private const string PatientRole = "Patient";

        // Fakes we need to control in the tests
        private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
        private readonly Mock<IPatientRepository> _patientRepositoryMock;
        private readonly Mock<IRegistrationRepository> _registrationRepositoryMock;
        private readonly Mock<IPendingProfileUpdateStore> _pendingProfileUpdateStoreMock;
        private readonly Mock<ISmsSender> _smsSenderMock;
        private readonly Mock<IEmailSender> _emailSenderMock;

        // The real class under test
        private readonly UserService _userService;

        public UserServiceTests()
        {
            // UserManager is a class, not an interface, so Moq needs its constructor arguments
            _userManagerMock = new Mock<UserManager<ApplicationUser>>(
                Mock.Of<IUserStore<ApplicationUser>>(), null!, null!, null!, null!, null!, null!, null!, null!);
            _patientRepositoryMock = new Mock<IPatientRepository>();
            _registrationRepositoryMock = new Mock<IRegistrationRepository>();
            _pendingProfileUpdateStoreMock = new Mock<IPendingProfileUpdateStore>();
            _smsSenderMock = new Mock<ISmsSender>();
            _emailSenderMock = new Mock<IEmailSender>();

            _userManagerMock
                .Setup(m => m.GetRolesAsync(It.IsAny<ApplicationUser>()))
                .ReturnsAsync(new List<string> { PatientRole });

            _userService = new UserService(
                _userManagerMock.Object,
                _patientRepositoryMock.Object,
                _registrationRepositoryMock.Object,
                _pendingProfileUpdateStoreMock.Object,
                _smsSenderMock.Object,
                _emailSenderMock.Object,
                Options.Create(new RegisterOtpSettings()),
                Mock.Of<ILogger<UserService>>());
        }

        // ===== OZ-ME-01 GetProfile =====

        // UTCID01 (N): a patient account returns the details from the patient record
        [Fact]
        public async Task GetUserProfileAsync_PatientUser_ReturnsPatientDetails()
        {
            var user = new ApplicationUser { Id = UserId, Email = Email, PhoneNumber = "+84912345678" };
            var patient = new Patient
            {
                UserId = UserId,
                FullName = "Nguyen Van A",
                PhoneNumber = "+84912345678",
                DateOfBirth = new DateOnly(2000, 1, 15),
                Gender = "Male",
                Address = "Ha Noi"
            };
            _userManagerMock.Setup(m => m.FindByIdAsync(UserId)).ReturnsAsync(user);
            _patientRepositoryMock.Setup(r => r.GetByUserIdAsync(UserId)).ReturnsAsync(patient);

            var result = await _userService.GetUserProfileAsync(UserId);

            result.Should().NotBeNull();
            result!.Id.Should().Be(UserId);
            result.Email.Should().Be(Email);
            result.FullName.Should().Be("Nguyen Van A");
            result.PhoneNumber.Should().Be("+84912345678");
            result.DateOfBirth.Should().Be(new DateOnly(2000, 1, 15));
            result.Gender.Should().Be("Male");
            result.Address.Should().Be("Ha Noi");
            result.Roles.Should().ContainSingle().Which.Should().Be(PatientRole);
        }

        // UTCID02 (N): a staff account has no patient record, so the name comes from the staff profile
        [Fact]
        public async Task GetUserProfileAsync_StaffUser_ReturnsStaffNameWithoutPatientDetails()
        {
            var user = new ApplicationUser
            {
                Id = UserId,
                Email = "doctor@oze.vn",
                PhoneNumber = "+84987654321",
                StaffProfile = new StaffProfile { FullName = "Tran Thi B" }
            };
            _userManagerMock.Setup(m => m.FindByIdAsync(UserId)).ReturnsAsync(user);
            _userManagerMock.Setup(m => m.Users).Returns(new List<ApplicationUser> { user }.AsQueryable());
            _userManagerMock.Setup(m => m.GetRolesAsync(user)).ReturnsAsync(new List<string> { "Doctor" });
            _patientRepositoryMock.Setup(r => r.GetByUserIdAsync(UserId)).ReturnsAsync((Patient?)null);

            var result = await _userService.GetUserProfileAsync(UserId);

            result.Should().NotBeNull();
            result!.FullName.Should().Be("Tran Thi B");
            result.PhoneNumber.Should().Be("+84987654321");
            result.DateOfBirth.Should().BeNull();
            result.Gender.Should().BeNull();
            result.Address.Should().BeNull();
            result.Roles.Should().ContainSingle().Which.Should().Be("Doctor");
        }

        // UTCID03 (A): an unknown user id returns null (the controller turns it into 404)
        [Fact]
        public async Task GetUserProfileAsync_UserNotFound_ReturnsNull()
        {
            _userManagerMock.Setup(m => m.FindByIdAsync("unknown-user")).ReturnsAsync((ApplicationUser?)null);

            var result = await _userService.GetUserProfileAsync("unknown-user");

            result.Should().BeNull();
            _patientRepositoryMock.Verify(r => r.GetByUserIdAsync(It.IsAny<string>()), Times.Never);
        }

        // UTCID04 (B): account without email or phone falls back to an empty email and the patient's phone
        [Fact]
        public async Task GetUserProfileAsync_UserWithoutEmailAndPhone_FallsBackToPatientPhone()
        {
            var user = new ApplicationUser { Id = UserId, Email = null, PhoneNumber = null };
            var patient = new Patient { UserId = UserId, FullName = "Le Van C", PhoneNumber = "+84911111111" };
            _userManagerMock.Setup(m => m.FindByIdAsync(UserId)).ReturnsAsync(user);
            _patientRepositoryMock.Setup(r => r.GetByUserIdAsync(UserId)).ReturnsAsync(patient);

            var result = await _userService.GetUserProfileAsync(UserId);

            result.Should().NotBeNull();
            result!.Email.Should().BeEmpty();
            result.PhoneNumber.Should().Be("+84911111111");
            result.FullName.Should().Be("Le Van C");
        }

        // ===== OZ-ME-02 UpdateProfile =====

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

        // ===== OZ-ME-03 ResendConfirmEmail =====

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

        // ===== OZ-ME-04 VerifyPhoneOtp =====

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

        // ===== OZ-ME-05 ResendPhoneOtp =====

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

        // ===== Shared test data =====

        private const string BaseUrl = "https://oze.test";
        private const string CurrentPhone = "+84912345678";
        private const string NewPhone = "+84987654321";
        private const string NewPhoneLocal = "0987654321";
        private const string SessionId = "session-1";
        private const string Otp = "123456";
        private const string SecurityStamp = "stamp-1";
        private const int PatientId = 10;
        private static readonly DateTimeOffset PatientUpdatedAt = new(2026, 11, 1, 8, 0, 0, TimeSpan.Zero);

        private static DateOnly ClinicToday() => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));

        private static ApplicationUser NewUser() => new()
        {
            Id = UserId,
            UserName = CurrentPhone,
            Email = Email,
            PhoneNumber = CurrentPhone,
            SecurityStamp = SecurityStamp
        };

        // A patient account whose save succeeds; phone and email are free unless a test says otherwise
        private (ApplicationUser User, Patient Patient) ArrangeUserAndPatient()
        {
            var user = NewUser();
            var patient = new Patient
            {
                Id = PatientId,
                UserId = UserId,
                FullName = "Nguyen Van A",
                PhoneNumber = CurrentPhone,
                Email = Email,
                UpdatedAt = PatientUpdatedAt
            };
            _userManagerMock.Setup(m => m.FindByIdAsync(UserId)).ReturnsAsync(user);
            _userManagerMock.Setup(m => m.UpdateAsync(user)).ReturnsAsync(IdentityResult.Success);
            _patientRepositoryMock.Setup(r => r.GetByUserIdAsync(UserId)).ReturnsAsync(patient);
            return (user, patient);
        }

        // A pending phone change to NewPhone with OTP "123456", sent 2 minutes ago and valid for 3 more
        private PendingProfileUpdate ArrangePendingUpdate(Action<PendingProfileUpdate>? change = null)
        {
            var update = new PendingProfileUpdate
            {
                SessionId = SessionId,
                UserId = UserId,
                SecurityStamp = SecurityStamp,
                ProfileUpdatedAt = PatientUpdatedAt,
                FullName = "Nguyen Van A",
                DateOfBirth = new DateOnly(2000, 1, 15),
                Gender = "Male",
                PhoneNumber = NewPhone,
                Email = Email,
                OtpHash = OtpHelper.Hash(SessionId, Otp),
                LastSentAt = DateTime.UtcNow.AddMinutes(-2),
                ExpiresAt = DateTime.UtcNow.AddMinutes(3)
            };
            change?.Invoke(update);
            _pendingProfileUpdateStoreMock.Setup(s => s.Get(SessionId)).Returns(update);
            return update;
        }

        private static UpdateProfileRequest ValidUpdateRequest(
            string phone = CurrentPhone,
            DateOnly? dateOfBirth = null,
            string? email = Email,
            string fullName = "Nguyen Van A",
            string? address = "Ha Noi") => new()
        {
            FullName = fullName,
            DateOfBirth = dateOfBirth ?? new DateOnly(2000, 1, 15),
            Gender = "Male",
            PhoneNumber = phone,
            Email = email,
            Address = address
        };

        private static VerifyOtpRequest VerifyRequest(string otp) => new() { SessionId = SessionId, Otp = otp };
    }
}
