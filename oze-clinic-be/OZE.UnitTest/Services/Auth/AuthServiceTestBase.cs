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
    // Shared mocks, setup and test data for the Auth tests. Holds no tests itself.
    public abstract class AuthServiceTestBase
    {
        protected const string Email = "patient@oze.vn";
        protected const string Password = "Test@123";
        protected const string AccessToken = "access-token";
        protected const string RefreshToken = "refresh-token";
        protected const string UserFullName = "Nguyen Van A";
        protected const string UserRole = "Patient";

        // Fakes we need to control in the tests
        protected readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
        protected readonly Mock<SignInManager<ApplicationUser>> _signInManagerMock;
        protected readonly Mock<IUserRefreshTokenRepository> _refreshTokenRepositoryMock;
        protected readonly Mock<IJwtTokenGenerator> _jwtTokenGeneratorMock;
        protected readonly Mock<IUserService> _userServiceMock;
        protected readonly Mock<IRegistrationRepository> _registrationRepositoryMock;
        protected readonly Mock<IPasswordResetStore> _passwordResetStoreMock;
        protected readonly Mock<ISmsSender> _smsSenderMock;
        protected readonly Mock<IEmailSender> _emailSenderMock;
        protected readonly Mock<IPendingRegistrationStore> _pendingStoreMock;

        // The real class under test
        protected readonly AuthService _authService;

        protected AuthServiceTestBase()
        {
            // UserManager is a class, not an interface, so Moq needs its constructor arguments.
            // The user store is required; a real password hasher is given because registration hashes passwords itself.
            _userManagerMock = new Mock<UserManager<ApplicationUser>>(
                Mock.Of<IUserStore<ApplicationUser>>(), null!, new PasswordHasher<ApplicationUser>(), null!, null!, null!, null!, null!, null!);

            // SignInManager is also a class; it needs a UserManager and 6 more arguments
            _signInManagerMock = new Mock<SignInManager<ApplicationUser>>(
                _userManagerMock.Object,
                Mock.Of<IHttpContextAccessor>(),
                Mock.Of<IUserClaimsPrincipalFactory<ApplicationUser>>(),
                null!, null!, null!, null!);

            _refreshTokenRepositoryMock = new Mock<IUserRefreshTokenRepository>();
            _jwtTokenGeneratorMock = new Mock<IJwtTokenGenerator>();
            _userServiceMock = new Mock<IUserService>();
            _registrationRepositoryMock = new Mock<IRegistrationRepository>();
            _passwordResetStoreMock = new Mock<IPasswordResetStore>();
            _smsSenderMock = new Mock<ISmsSender>();
            _emailSenderMock = new Mock<IEmailSender>();
            _pendingStoreMock = new Mock<IPendingRegistrationStore>();

            // The transaction just runs the work it is given, whatever its result type
            _registrationRepositoryMock
                .Setup(r => r.ExecuteInTransactionAsync(It.IsAny<Func<Task<It.IsAnyType>>>(), It.IsAny<Func<It.IsAnyType, bool>>()))
                .Returns(new InvocationFunc(invocation => ((Delegate)invocation.Arguments[0]).DynamicInvoke()!));

            // Every successful login asks for a token pair
            _jwtTokenGeneratorMock.Setup(g => g.GenerateTokenAsync(It.IsAny<ApplicationUser>())).ReturnsAsync(AccessToken);
            _jwtTokenGeneratorMock.Setup(g => g.GenerateRefreshToken()).Returns(RefreshToken);
            _userServiceMock.Setup(s => s.GetFullName(It.IsAny<string>())).Returns(UserFullName);
            _userManagerMock
                .Setup(m => m.GetRolesAsync(It.IsAny<ApplicationUser>()))
                .ReturnsAsync(new List<string> { UserRole });

            _authService = CreateService(jwtExpiresInMinutes: 30);
        }

        // Builds the real AuthService with the fakes (".Object" gives the fake itself)
        protected AuthService CreateService(int jwtExpiresInMinutes)
        {
            return new AuthService(
                _userManagerMock.Object,
                _signInManagerMock.Object,
                _refreshTokenRepositoryMock.Object,
                _jwtTokenGeneratorMock.Object,
                _userServiceMock.Object,
                _emailSenderMock.Object,
                _smsSenderMock.Object,
                _pendingStoreMock.Object,
                _passwordResetStoreMock.Object,
                _registrationRepositoryMock.Object,
                Options.Create(new JwtSettings { ExpiresInMinutes = jwtExpiresInMinutes }),
                Options.Create(new RegisterOtpSettings()),
                Mock.Of<ILogger<AuthService>>());
        }

        // A normal, verified user used by most tests
        protected static ApplicationUser ActiveUser() => new()
        {
            Id = "user-1",
            Email = Email,
            PhoneNumber = "+84912345678",
            EmailConfirmed = true,
            PhoneNumberConfirmed = true
        };

        // A patient who registered but never entered the OTP
        protected static ApplicationUser PendingRegistrationUser() => new()
        {
            Id = "user-pending",
            Email = Email,
            EmailConfirmed = false,
            PhoneNumberConfirmed = false,
            LockoutEnd = DateTimeOffset.MaxValue
        };

        protected void SetupFindByEmail(ApplicationUser? user)
        {
            _userManagerMock.Setup(m => m.FindByEmailAsync(Email)).ReturnsAsync(user);
        }

        protected void SetupPasswordCheck(ApplicationUser user, SignInResult result)
        {
            _signInManagerMock.Setup(s => s.CheckPasswordSignInAsync(user, Password, true)).ReturnsAsync(result);
        }

        protected void VerifyPasswordNeverChecked()
        {
            _signInManagerMock.Verify(
                s => s.CheckPasswordSignInAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>(), It.IsAny<bool>()),
                Times.Never);
        }

        protected void VerifyNoTokenIssued()
        {
            _jwtTokenGeneratorMock.Verify(g => g.GenerateTokenAsync(It.IsAny<ApplicationUser>()), Times.Never);
            _refreshTokenRepositoryMock.Verify(r => r.AddAsync(It.IsAny<UserRefreshToken>()), Times.Never);
        }



        protected const string UserId = "user-1";
        protected const string CurrentPassword = "Old@1234";
        protected const string NewPassword = "New@1234";

        protected static ChangePasswordRequest ValidChangeRequest() => new()
        {
            CurrentPassword = CurrentPassword,
            NewPassword = NewPassword,
            ConfirmPassword = NewPassword
        };

        protected void SetupFindById(ApplicationUser? user)
        {
            _userManagerMock.Setup(m => m.FindByIdAsync(UserId)).ReturnsAsync(user);
        }

        protected void SetupIdentityChangePassword(ApplicationUser user, IdentityResult result)
        {
            _userManagerMock
                .Setup(m => m.ChangePasswordAsync(user, CurrentPassword, NewPassword))
                .ReturnsAsync(result);
        }

        protected void VerifyPasswordNeverChanged()
        {
            _userManagerMock.Verify(
                m => m.ChangePasswordAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>(), It.IsAny<string>()),
                Times.Never);
        }

        protected void VerifyDevicesNeverSignedOut()
        {
            _refreshTokenRepositoryMock.Verify(r => r.RevokeUserTokensAsync(It.IsAny<string>()), Times.Never);
            _refreshTokenRepositoryMock.Verify(
                r => r.RevokeUserTokensExceptAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        }



        protected const string DeviceToken = "device-token";

        protected void SetupActiveToken(UserRefreshToken? token)
        {
            _refreshTokenRepositoryMock.Setup(r => r.GetActiveTokenAsync(DeviceToken)).ReturnsAsync(token);
        }



        protected const string OldRefreshToken = "old-refresh-token";

        protected static UserRefreshToken ActiveOldToken() => new()
        {
            UserId = UserId,
            RefreshToken = OldRefreshToken,
            ExpiryDate = DateTimeOffset.UtcNow.AddDays(3)
        };

        protected void SetupOldToken(UserRefreshToken? token)
        {
            _refreshTokenRepositoryMock.Setup(r => r.GetActiveTokenAsync(OldRefreshToken)).ReturnsAsync(token);
            if (token != null)
            {
                // The old token is still active, so revoking it succeeds
                _refreshTokenRepositoryMock.Setup(r => r.TryRevokeAsync(token.Id, It.IsAny<DateTimeOffset>())).ReturnsAsync(true);
            }
        }

        protected static RefreshTokenRequest OldTokenRequest() => new() { RefreshToken = OldRefreshToken };



        protected const string RawEmailToken = "identity-email-token";

        // The confirmation link carries the Identity token encoded as Base64Url, like VerifyOtpAsync builds it
        protected static string EncodeForLink(string token) =>
            WebEncoders.Base64UrlEncode(System.Text.Encoding.UTF8.GetBytes(token));



        protected const string Phone = "0912345678";
        protected const string NormalizedPhone = "+84912345678";

        protected void SetupFindByPhone(ApplicationUser? user)
        {
            _registrationRepositoryMock
                .Setup(r => r.FindUserByPhoneAsync(It.IsAny<IReadOnlyCollection<string>>()))
                .ReturnsAsync(user);
        }

        // No code goes out, and the session kept is a decoy no code opens, so the next step answers like a real one
        protected void VerifyNothingSentAndNoSessionSaved()
        {
            _smsSenderMock.Verify(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
            _emailSenderMock.Verify(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
            _passwordResetStoreMock.Verify(s => s.Save(It.Is<PasswordResetSession>(x => x.UserId == string.Empty), It.IsAny<TimeSpan>()), Times.Once);
            _passwordResetStoreMock.Verify(s => s.Save(It.Is<PasswordResetSession>(x => x.UserId != string.Empty), It.IsAny<TimeSpan>()), Times.Never);
        }



        protected const string ResetSessionId = "reset-session-1";
        protected const string CorrectOtp = "123456";
        protected const string WrongOtp = "000000";
        protected const string IdentityResetToken = "identity-reset-token";
        // RegisterOtpSettings defaults: 5 attempts, codes live 5 minutes
        protected const int MaxOtpAttempts = 5;
        protected const int OtpLifetimeMinutes = 5;

        // A session created by ForgotPasswordAsync whose correct code is 123456
        protected static PasswordResetSession NewResetSession(int failedAttempts = 0, int expiresInMinutes = 3) => new()
        {
            SessionId = ResetSessionId,
            UserId = UserId,
            ExpiresAt = DateTime.UtcNow.AddMinutes(expiresInMinutes),
            OtpHash = OtpHelper.Hash(ResetSessionId, CorrectOtp),
            FailedAttempts = failedAttempts
        };

        protected void SetupResetSession(PasswordResetSession? session)
        {
            _passwordResetStoreMock.Setup(s => s.Get(ResetSessionId)).Returns(session);
        }

        protected static VerifyResetOtpRequest ResetOtpRequest(string otp) => new() { SessionId = ResetSessionId, Otp = otp };

        protected void VerifyResetTokenNeverCreated()
        {
            _userManagerMock.Verify(m => m.GeneratePasswordResetTokenAsync(It.IsAny<ApplicationUser>()), Times.Never);
        }



        protected const string ResetNewPassword = "Reset@1234";

        // A session that already passed VerifyResetOtpAsync
        protected static PasswordResetSession VerifiedResetSession()
        {
            var session = NewResetSession();
            session.IsOtpVerified = true;
            session.ResetToken = IdentityResetToken;
            return session;
        }

        protected static ResetPasswordRequest NewPasswordRequest() => new()
        {
            SessionId = ResetSessionId,
            NewPassword = ResetNewPassword,
            ConfirmPassword = ResetNewPassword
        };

        protected void SetupIdentityResetPassword(ApplicationUser user, IdentityResult result)
        {
            _userManagerMock
                .Setup(m => m.ResetPasswordAsync(user, IdentityResetToken, ResetNewPassword))
                .ReturnsAsync(result);
        }

        protected void VerifyPasswordNeverReset()
        {
            _userManagerMock.Verify(
                m => m.ResetPasswordAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>(), It.IsAny<string>()),
                Times.Never);
        }



        protected const string RegisterPassword = "Test@1234";
        protected const string BaseUrl = "https://oze.test";

        protected static RegisterRequest ValidRegisterRequest(string method = VerificationMethodConstants.Sms) => new()
        {
            FullName = "Nguyen Van A",
            DateOfBirth = new DateOnly(2000, 1, 15),
            Gender = "Male",
            PhoneNumber = Phone,
            Email = method == VerificationMethodConstants.Email ? Email : null,
            Password = RegisterPassword,
            ConfirmPassword = RegisterPassword,
            VerificationMethod = method
        };

        // Identity calls succeed by default; a test overrides the one it wants to break
        protected void SetupIdentityWritesSucceed()
        {
            _userManagerMock.Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>())).ReturnsAsync(IdentityResult.Success);
            _userManagerMock.Setup(m => m.UpdateAsync(It.IsAny<ApplicationUser>())).ReturnsAsync(IdentityResult.Success);
            _userManagerMock.Setup(m => m.AddToRoleAsync(It.IsAny<ApplicationUser>(), RoleConstants.PatientRole)).ReturnsAsync(IdentityResult.Success);
        }

        protected void VerifyNoAccountSaved()
        {
            _userManagerMock.Verify(m => m.CreateAsync(It.IsAny<ApplicationUser>()), Times.Never);
            _userManagerMock.Verify(m => m.UpdateAsync(It.IsAny<ApplicationUser>()), Times.Never);
        }

        protected void VerifyNoOtpSentAndNoPendingSaved()
        {
            _smsSenderMock.Verify(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
            _emailSenderMock.Verify(e => e.SendRegistrationOtpAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>()), Times.Never);
            _pendingStoreMock.Verify(s => s.Save(It.IsAny<PendingRegistration>(), It.IsAny<TimeSpan>()), Times.Never);
        }



        protected const string RegisterSessionId = "register-session-1";
        protected const string AccountStamp = "stamp-1";

        // The locked account RegisterAsync created and the session pointing at it
        protected static ApplicationUser UnverifiedAccount() => new()
        {
            Id = "user-new",
            PhoneNumber = NormalizedPhone,
            SecurityStamp = AccountStamp,
            PhoneNumberConfirmed = false,
            EmailConfirmed = false,
            LockoutEnd = DateTimeOffset.MaxValue
        };

        protected static PendingRegistration NewPending(
            string method = VerificationMethodConstants.Sms, int failedAttempts = 0, int expiresInMinutes = 3, int sentSecondsAgo = 120) => new()
        {
            SessionId = RegisterSessionId,
            UserId = "user-new",
            SecurityStamp = AccountStamp,
            VerificationMethod = method,
            FullName = "Nguyen Van A",
            DateOfBirth = new DateOnly(2000, 1, 15),
            Gender = "Male",
            PhoneNumber = NormalizedPhone,
            Email = method == VerificationMethodConstants.Email ? Email : null,
            OtpHash = OtpHelper.Hash(RegisterSessionId, CorrectOtp),
            ExpiresAt = DateTime.UtcNow.AddMinutes(expiresInMinutes),
            LastSentAt = DateTime.UtcNow.AddSeconds(-sentSecondsAgo),
            FailedAttempts = failedAttempts
        };

        protected void SetupPending(PendingRegistration? pending)
        {
            _pendingStoreMock.Setup(s => s.Get(RegisterSessionId)).Returns(pending);
        }

        protected void SetupUnverifiedAccount(ApplicationUser? account)
        {
            _userManagerMock.Setup(m => m.FindByIdAsync("user-new")).ReturnsAsync(account);
            if (account != null)
            {
                _userManagerMock.Setup(m => m.IsInRoleAsync(account, RoleConstants.PatientRole)).ReturnsAsync(true);
            }
        }



        protected static ResendOtpRequest ResendRequest() => new() { SessionId = RegisterSessionId };



        protected static VerifyOtpRequest RegisterOtpRequest(string otp) => new() { SessionId = RegisterSessionId, Otp = otp };

        protected void SetupWalkInPatients(params Patient[] patients)
        {
            _registrationRepositoryMock
                .Setup(r => r.FindUnlinkedPatientsByPhoneAsync(It.IsAny<IReadOnlyCollection<string>>()))
                .ReturnsAsync(patients.ToList());
        }
    }
}
