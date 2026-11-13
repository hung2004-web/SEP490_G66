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
    // Shared mocks, setup and test data for the Me tests. Holds no tests itself.
    public abstract class UserServiceTestBase
    {
        protected const string UserId = "user-1";
        protected const string Email = "patient@oze.vn";
        protected const string PatientRole = "Patient";

        // Fakes we need to control in the tests
        protected readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
        protected readonly Mock<IPatientRepository> _patientRepositoryMock;
        protected readonly Mock<IRegistrationRepository> _registrationRepositoryMock;
        protected readonly Mock<IPendingProfileUpdateStore> _pendingProfileUpdateStoreMock;
        protected readonly Mock<ISmsSender> _smsSenderMock;
        protected readonly Mock<IEmailSender> _emailSenderMock;

        // The real class under test
        protected readonly UserService _userService;

        protected UserServiceTestBase()
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
        protected const string BaseUrl = "https://oze.test";
        protected const string CurrentPhone = "+84912345678";
        protected const string NewPhone = "+84987654321";
        protected const string NewPhoneLocal = "0987654321";
        protected const string SessionId = "session-1";
        protected const string Otp = "123456";
        protected const string SecurityStamp = "stamp-1";
        protected const int PatientId = 10;
        protected static readonly DateTimeOffset PatientUpdatedAt = new(2026, 11, 1, 8, 0, 0, TimeSpan.Zero);

        protected static DateOnly ClinicToday() => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));

        protected static ApplicationUser NewUser() => new()
        {
            Id = UserId,
            UserName = CurrentPhone,
            Email = Email,
            PhoneNumber = CurrentPhone,
            SecurityStamp = SecurityStamp
        };

        // A patient account whose save succeeds; phone and email are free unless a test says otherwise
        protected (ApplicationUser User, Patient Patient) ArrangeUserAndPatient()
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
        protected PendingProfileUpdate ArrangePendingUpdate(Action<PendingProfileUpdate>? change = null)
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

        protected static UpdateProfileRequest ValidUpdateRequest(
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

        protected static VerifyOtpRequest VerifyRequest(string otp) => new() { SessionId = SessionId, Otp = otp };
    }
}
