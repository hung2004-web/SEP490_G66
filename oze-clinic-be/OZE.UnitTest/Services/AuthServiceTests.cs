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

namespace OZE.UnitTest.Services
{
    public class AuthServiceTests
    {
        private const string Email = "patient@oze.vn";
        private const string Password = "Test@123";
        private const string AccessToken = "access-token";
        private const string RefreshToken = "refresh-token";

        // Fakes we need to control in the tests
        private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
        private readonly Mock<SignInManager<ApplicationUser>> _signInManagerMock;
        private readonly Mock<IUserRefreshTokenRepository> _refreshTokenRepositoryMock;
        private readonly Mock<IJwtTokenGenerator> _jwtTokenGeneratorMock;
        private readonly Mock<IRegistrationRepository> _registrationRepositoryMock;
        private readonly Mock<IPasswordResetStore> _passwordResetStoreMock;
        private readonly Mock<ISmsSender> _smsSenderMock;
        private readonly Mock<IEmailSender> _emailSenderMock;
        private readonly Mock<IPendingRegistrationStore> _pendingStoreMock;

        // The real class under test
        private readonly AuthService _authService;

        public AuthServiceTests()
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

            _authService = CreateService(jwtExpiresInMinutes: 30);
        }

        // Builds the real AuthService with the fakes (".Object" gives the fake itself)
        private AuthService CreateService(int jwtExpiresInMinutes)
        {
            return new AuthService(
                _userManagerMock.Object,
                _signInManagerMock.Object,
                _refreshTokenRepositoryMock.Object,
                _jwtTokenGeneratorMock.Object,
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
        private static ApplicationUser ActiveUser() => new()
        {
            Id = "user-1",
            Email = Email,
            PhoneNumber = "+84912345678",
            EmailConfirmed = true,
            PhoneNumberConfirmed = true
        };

        // A patient who registered but never entered the OTP
        private static ApplicationUser PendingRegistrationUser() => new()
        {
            Id = "user-pending",
            Email = Email,
            EmailConfirmed = false,
            PhoneNumberConfirmed = false,
            LockoutEnd = DateTimeOffset.MaxValue
        };

        private void SetupFindByEmail(ApplicationUser? user)
        {
            _userManagerMock.Setup(m => m.FindByEmailAsync(Email)).ReturnsAsync(user);
        }

        private void SetupPasswordCheck(ApplicationUser user, SignInResult result)
        {
            _signInManagerMock.Setup(s => s.CheckPasswordSignInAsync(user, Password, true)).ReturnsAsync(result);
        }

        private void VerifyPasswordNeverChecked()
        {
            _signInManagerMock.Verify(
                s => s.CheckPasswordSignInAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>(), It.IsAny<bool>()),
                Times.Never);
        }

        private void VerifyNoTokenIssued()
        {
            _jwtTokenGeneratorMock.Verify(g => g.GenerateTokenAsync(It.IsAny<ApplicationUser>()), Times.Never);
            _refreshTokenRepositoryMock.Verify(r => r.AddAsync(It.IsAny<UserRefreshToken>()), Times.Never);
        }

        #region LoginAsync - success

        [Fact]
        public async Task LoginAsync_WithCorrectEmailAndPassword_ShouldReturnTokens()
        {
            // Arrange
            var user = ActiveUser();
            SetupFindByEmail(user);
            SetupPasswordCheck(user, SignInResult.Success);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert
            result.Success.Should().BeTrue();
            result.Data!.Token.Should().Be(AccessToken);
            result.Data.RefreshToken.Should().Be(RefreshToken);
        }

        [Fact]
        public async Task LoginAsync_WhenSuccessful_ShouldSaveRefreshTokenValidForSevenDays()
        {
            // Arrange
            var user = ActiveUser();
            SetupFindByEmail(user);
            SetupPasswordCheck(user, SignInResult.Success);
            UserRefreshToken? saved = null;
            _refreshTokenRepositoryMock
                .Setup(r => r.AddAsync(It.IsAny<UserRefreshToken>()))
                .Callback<UserRefreshToken>(t => saved = t);

            // Act
            await _authService.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert
            saved.Should().NotBeNull();
            saved!.UserId.Should().Be(user.Id);
            saved.RefreshToken.Should().Be(RefreshToken);
            saved.ExpiryDate.Should().BeCloseTo(DateTimeOffset.UtcNow.AddDays(7), TimeSpan.FromMinutes(1));
            _refreshTokenRepositoryMock.Verify(r => r.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task LoginAsync_WhenSuccessful_AccessTokenShouldExpireAfterConfiguredMinutes()
        {
            // Arrange
            var user = ActiveUser();
            SetupFindByEmail(user);
            SetupPasswordCheck(user, SignInResult.Success);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert: the service was built with ExpiresInMinutes = 30
            result.Data!.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(30), TimeSpan.FromMinutes(1));
        }

        [Fact]
        public async Task LoginAsync_WhenExpiryNotConfigured_AccessTokenShouldExpireAfterSixtyMinutes()
        {
            // Arrange
            var service = CreateService(jwtExpiresInMinutes: 0);
            var user = ActiveUser();
            SetupFindByEmail(user);
            SetupPasswordCheck(user, SignInResult.Success);

            // Act
            var result = await service.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert
            result.Data!.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(60), TimeSpan.FromMinutes(1));
        }

        [Fact]
        public async Task LoginAsync_WithSpacesAroundEmail_ShouldTrimAndSucceed()
        {
            // Arrange
            var user = ActiveUser();
            SetupFindByEmail(user);
            SetupPasswordCheck(user, SignInResult.Success);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = $"  {Email}  ", Password = Password });

            // Assert
            result.Success.Should().BeTrue();
        }

        [Theory]
        [InlineData("0912345678")]
        [InlineData("+84912345678")]
        [InlineData("84912345678")]
        [InlineData("0912 345 678")]
        [InlineData("0912.345.678")]
        [InlineData("0912-345-678")]
        public async Task LoginAsync_WithPhoneNumberInAnyFormat_ShouldFindUserByAllStoredVariants(string phone)
        {
            // Arrange: the lookup must cover every way the number may be stored
            var user = ActiveUser();
            _registrationRepositoryMock
                .Setup(r => r.FindUserByPhoneAsync(It.Is<IReadOnlyCollection<string>>(v =>
                    v.Contains("+84912345678") && v.Contains("84912345678") && v.Contains("0912345678"))))
                .ReturnsAsync(user);
            SetupPasswordCheck(user, SignInResult.Success);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = phone, Password = Password });

            // Assert
            result.Success.Should().BeTrue();
            _userManagerMock.Verify(m => m.FindByEmailAsync(It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task LoginAsync_ShouldLockAccountAfterTooManyFailures()
        {
            // Arrange
            var user = ActiveUser();
            SetupFindByEmail(user);
            SetupPasswordCheck(user, SignInResult.Success);

            // Act
            await _authService.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert: lockoutOnFailure must be true so repeated wrong passwords lock the account
            _signInManagerMock.Verify(s => s.CheckPasswordSignInAsync(user, Password, true), Times.Once);
        }

        [Fact]
        public async Task LoginAsync_StaffWithUnconfirmedContact_ShouldStillBeAbleToLogIn()
        {
            // Arrange: only patients go through OTP registration, so a staff account is never "pending"
            var user = PendingRegistrationUser();
            SetupFindByEmail(user);
            _userManagerMock.Setup(m => m.IsInRoleAsync(user, RoleConstants.PatientRole)).ReturnsAsync(false);
            SetupPasswordCheck(user, SignInResult.Success);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert
            result.Success.Should().BeTrue();
        }

        #endregion

        #region LoginAsync - failure

        [Fact]
        public async Task LoginAsync_WhenEmailNotFound_ShouldReturnInvalidLogin()
        {
            // Arrange
            SetupFindByEmail(null);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidLogin);
            VerifyPasswordNeverChecked();
            VerifyNoTokenIssued();
        }

        [Fact]
        public async Task LoginAsync_WhenPhoneNotFound_ShouldReturnInvalidLogin()
        {   
            // Arrange
            _registrationRepositoryMock
                .Setup(r => r.FindUserByPhoneAsync(It.IsAny<IReadOnlyCollection<string>>()))
                .ReturnsAsync((ApplicationUser?)null);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = "0912345678", Password = Password });

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidLogin);
            VerifyPasswordNeverChecked();
        }

        [Theory]
        [InlineData("abc123")]          // letters
        [InlineData("091234567")]       // too short
        [InlineData("09123456789")]     // too long
        [InlineData("0112345678")]      // not a Vietnamese mobile prefix
        [InlineData("+1 202 555 0143")] // foreign number
        public async Task LoginAsync_WithInvalidPhoneNumber_ShouldReturnInvalidLoginWithoutQueryingDatabase(string phone)
        {
            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = phone, Password = Password });

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidLogin);
            _registrationRepositoryMock.Verify(r => r.FindUserByPhoneAsync(It.IsAny<IReadOnlyCollection<string>>()), Times.Never);
            VerifyPasswordNeverChecked();
        }

        [Fact]
        public async Task LoginAsync_WhenRegistrationNotVerified_ShouldReturnInvalidLogin()
        {
            // Arrange: a patient who never entered the OTP is locked "forever" until verified
            var user = PendingRegistrationUser();
            SetupFindByEmail(user);
            _userManagerMock.Setup(m => m.IsInRoleAsync(user, RoleConstants.PatientRole)).ReturnsAsync(true);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert: say "invalid login", not "locked"
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidLogin);
            VerifyPasswordNeverChecked();
            VerifyNoTokenIssued();
        }

        [Fact]
        public async Task LoginAsync_WithWrongPassword_ShouldReturnInvalidLogin()
        {
            // Arrange
            var user = ActiveUser();
            SetupFindByEmail(user);
            SetupPasswordCheck(user, SignInResult.Failed);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidLogin);
            VerifyNoTokenIssued();
        }

        [Fact]
        public async Task LoginAsync_WhenLockedOut_ShouldReturnLockedMessage()
        {
            // Arrange
            var user = ActiveUser();
            SetupFindByEmail(user);
            SetupPasswordCheck(user, SignInResult.LockedOut);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Contain("locked");
            VerifyNoTokenIssued();
        }

        [Fact]
        public async Task LoginAsync_WhenSignInNotAllowed_ShouldReturnInvalidLogin()
        {
            // Arrange: Identity can refuse sign-in, e.g. when confirmation is required
            var user = ActiveUser();
            SetupFindByEmail(user);
            SetupPasswordCheck(user, SignInResult.NotAllowed);

            // Act
            var result = await _authService.LoginAsync(new LoginRequest { Identifier = Email, Password = Password });

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidLogin);
            VerifyNoTokenIssued();
        }

        #endregion

        #region ChangePasswordAsync

        private const string UserId = "user-1";
        private const string CurrentPassword = "Old@1234";
        private const string NewPassword = "New@1234";

        private static ChangePasswordRequest ValidChangeRequest() => new()
        {
            CurrentPassword = CurrentPassword,
            NewPassword = NewPassword,
            ConfirmPassword = NewPassword
        };

        private void SetupFindById(ApplicationUser? user)
        {
            _userManagerMock.Setup(m => m.FindByIdAsync(UserId)).ReturnsAsync(user);
        }

        private void SetupIdentityChangePassword(ApplicationUser user, IdentityResult result)
        {
            _userManagerMock
                .Setup(m => m.ChangePasswordAsync(user, CurrentPassword, NewPassword))
                .ReturnsAsync(result);
        }

        private void VerifyPasswordNeverChanged()
        {
            _userManagerMock.Verify(
                m => m.ChangePasswordAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>(), It.IsAny<string>()),
                Times.Never);
        }

        private void VerifyDevicesNeverSignedOut()
        {
            _refreshTokenRepositoryMock.Verify(r => r.RevokeUserTokensAsync(It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task ChangePasswordAsync_WithValidRequest_ShouldChangePasswordAndSignOutAllDevices()
        {
            // Arrange
            var user = ActiveUser();
            SetupFindById(user);
            SetupIdentityChangePassword(user, IdentityResult.Success);

            // Act
            var result = await _authService.ChangePasswordAsync(UserId, ValidChangeRequest());

            // Assert: old refresh tokens are revoked so other devices must sign in again
            result.Success.Should().BeTrue();
            _userManagerMock.Verify(m => m.ChangePasswordAsync(user, CurrentPassword, NewPassword), Times.Once);
            _refreshTokenRepositoryMock.Verify(r => r.RevokeUserTokensAsync(UserId), Times.Once);
            _refreshTokenRepositoryMock.Verify(r => r.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task ChangePasswordAsync_WithoutConfirmPassword_ShouldSkipMatchCheckAndSucceed()
        {
            // Arrange: the service only compares the confirmation when it is sent
            var user = ActiveUser();
            SetupFindById(user);
            SetupIdentityChangePassword(user, IdentityResult.Success);
            var request = ValidChangeRequest();
            request.ConfirmPassword = string.Empty;

            // Act
            var result = await _authService.ChangePasswordAsync(UserId, request);

            // Assert
            result.Success.Should().BeTrue();
        }

        [Fact]
        public async Task ChangePasswordAsync_WhenUserNotFound_ShouldFail()
        {
            // Arrange
            SetupFindById(null);

            // Act
            var result = await _authService.ChangePasswordAsync(UserId, ValidChangeRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.UserNotFound);
            VerifyPasswordNeverChanged();
            VerifyDevicesNeverSignedOut();
        }

        [Fact]
        public async Task ChangePasswordAsync_WhenNewPasswordSameAsCurrent_ShouldFail()
        {
            // Arrange
            SetupFindById(ActiveUser());
            var request = new ChangePasswordRequest
            {
                CurrentPassword = CurrentPassword,
                NewPassword = CurrentPassword,
                ConfirmPassword = CurrentPassword
            };

            // Act
            var result = await _authService.ChangePasswordAsync(UserId, request);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.SamePassword);
            VerifyPasswordNeverChanged();
        }

        [Fact]
        public async Task ChangePasswordAsync_WhenConfirmPasswordDoesNotMatch_ShouldFail()
        {
            // Arrange
            SetupFindById(ActiveUser());
            var request = ValidChangeRequest();
            request.ConfirmPassword = "Other@1234";

            // Act
            var result = await _authService.ChangePasswordAsync(UserId, request);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.PasswordMismatch);
            VerifyPasswordNeverChanged();
        }

        [Fact]
        public async Task ChangePasswordAsync_WhenCurrentPasswordIsWrong_ShouldReturnIdentityErrors()
        {
            // Arrange: Identity rejects the current password
            var user = ActiveUser();
            SetupFindById(user);
            SetupIdentityChangePassword(user, IdentityResult.Failed(
                new IdentityError { Code = "PasswordMismatch", Description = "Incorrect password." }));

            // Act
            var result = await _authService.ChangePasswordAsync(UserId, ValidChangeRequest());

            // Assert: no device is signed out when nothing changed
            result.Success.Should().BeFalse();
            result.Message.Should().Be("Change password failed");
            result.Errors.Should().Contain("Incorrect password.");
            VerifyDevicesNeverSignedOut();
        }

        [Fact]
        public async Task ChangePasswordAsync_WhenNewPasswordBreaksPolicy_ShouldReturnIdentityErrors()
        {
            // Arrange: Identity rejects a weak new password
            var user = ActiveUser();
            SetupFindById(user);
            SetupIdentityChangePassword(user, IdentityResult.Failed(
                new IdentityError { Code = "PasswordRequiresDigit", Description = "Passwords must have at least one digit." }));

            // Act
            var result = await _authService.ChangePasswordAsync(UserId, ValidChangeRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Errors.Should().Contain("Passwords must have at least one digit.");
            VerifyDevicesNeverSignedOut();
        }

        #endregion

        #region LogoutAsync

        private const string DeviceToken = "device-token";

        private void SetupActiveToken(UserRefreshToken? token)
        {
            _refreshTokenRepositoryMock.Setup(r => r.GetActiveTokenAsync(DeviceToken)).ReturnsAsync(token);
        }

        [Fact]
        public async Task LogoutAsync_WithoutRefreshToken_ShouldSignOutAllDevices()
        {
            // Act
            var result = await _authService.LogoutAsync(UserId);

            // Assert
            result.Success.Should().BeTrue();
            _refreshTokenRepositoryMock.Verify(r => r.RevokeUserTokensAsync(UserId), Times.Once);
            _refreshTokenRepositoryMock.Verify(r => r.GetActiveTokenAsync(It.IsAny<string>()), Times.Never);
            _refreshTokenRepositoryMock.Verify(r => r.SaveChangesAsync(), Times.Once);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public async Task LogoutAsync_WithBlankRefreshToken_ShouldSignOutAllDevices(string blankToken)
        {
            // Act
            var result = await _authService.LogoutAsync(UserId, blankToken);

            // Assert: a blank token is treated the same as no token
            result.Success.Should().BeTrue();
            _refreshTokenRepositoryMock.Verify(r => r.RevokeUserTokensAsync(UserId), Times.Once);
        }

        [Fact]
        public async Task LogoutAsync_WithOwnRefreshToken_ShouldSignOutOnlyThatDevice()
        {
            // Arrange
            var token = new UserRefreshToken { UserId = UserId, RefreshToken = DeviceToken };
            SetupActiveToken(token);

            // Act
            var result = await _authService.LogoutAsync(UserId, DeviceToken);

            // Assert: only this token is revoked, other devices stay signed in
            result.Success.Should().BeTrue();
            token.RevokedAt.Should().NotBeNull();
            _refreshTokenRepositoryMock.Verify(r => r.UpdateAsync(token), Times.Once);
            _refreshTokenRepositoryMock.Verify(r => r.RevokeUserTokensAsync(It.IsAny<string>()), Times.Never);
            _refreshTokenRepositoryMock.Verify(r => r.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task LogoutAsync_WithAnotherUsersRefreshToken_ShouldNotRevokeIt()
        {
            // Arrange: someone sends a token that belongs to a different account
            var token = new UserRefreshToken { UserId = "other-user", RefreshToken = DeviceToken };
            SetupActiveToken(token);

            // Act
            var result = await _authService.LogoutAsync(UserId, DeviceToken);

            // Assert
            result.Success.Should().BeTrue();
            token.RevokedAt.Should().BeNull();
            _refreshTokenRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<UserRefreshToken>()), Times.Never);
            _refreshTokenRepositoryMock.Verify(r => r.RevokeUserTokensAsync(It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task LogoutAsync_WithUnknownOrExpiredRefreshToken_ShouldStillSucceed()
        {
            // Arrange: the token is no longer active
            SetupActiveToken(null);

            // Act
            var result = await _authService.LogoutAsync(UserId, DeviceToken);

            // Assert: logging out twice must not fail
            result.Success.Should().BeTrue();
            _refreshTokenRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<UserRefreshToken>()), Times.Never);
            _refreshTokenRepositoryMock.Verify(r => r.RevokeUserTokensAsync(It.IsAny<string>()), Times.Never);
        }

        #endregion

        #region RefreshTokenAsync

        private const string OldRefreshToken = "old-refresh-token";

        private static UserRefreshToken ActiveOldToken() => new()
        {
            UserId = UserId,
            RefreshToken = OldRefreshToken,
            ExpiryDate = DateTimeOffset.UtcNow.AddDays(3)
        };

        private void SetupOldToken(UserRefreshToken? token)
        {
            _refreshTokenRepositoryMock.Setup(r => r.GetActiveTokenAsync(OldRefreshToken)).ReturnsAsync(token);
        }

        private static RefreshTokenRequest OldTokenRequest() => new() { RefreshToken = OldRefreshToken };

        [Fact]
        public async Task RefreshTokenAsync_WithActiveToken_ShouldReturnNewTokenPair()
        {
            // Arrange
            SetupOldToken(ActiveOldToken());
            SetupFindById(ActiveUser());

            // Act
            var result = await _authService.RefreshTokenAsync(OldTokenRequest());

            // Assert
            result.Success.Should().BeTrue();
            result.Data!.Token.Should().Be(AccessToken);
            result.Data.RefreshToken.Should().Be(RefreshToken);
        }

        [Fact]
        public async Task RefreshTokenAsync_WithActiveToken_ShouldRevokeOldToken()
        {
            // Arrange
            var oldToken = ActiveOldToken();
            SetupOldToken(oldToken);
            SetupFindById(ActiveUser());

            // Act
            await _authService.RefreshTokenAsync(OldTokenRequest());

            // Assert: the old token cannot be used again
            oldToken.RevokedAt.Should().NotBeNull();
            _refreshTokenRepositoryMock.Verify(r => r.UpdateAsync(oldToken), Times.Once);
        }

        [Fact]
        public async Task RefreshTokenAsync_WithActiveToken_ShouldSaveNewTokenValidForSevenDays()
        {
            // Arrange
            SetupOldToken(ActiveOldToken());
            SetupFindById(ActiveUser());
            UserRefreshToken? saved = null;
            _refreshTokenRepositoryMock
                .Setup(r => r.AddAsync(It.IsAny<UserRefreshToken>()))
                .Callback<UserRefreshToken>(t => saved = t);

            // Act
            await _authService.RefreshTokenAsync(OldTokenRequest());

            // Assert
            saved.Should().NotBeNull();
            saved!.UserId.Should().Be(UserId);
            saved.RefreshToken.Should().Be(RefreshToken);
            saved.ExpiryDate.Should().BeCloseTo(DateTimeOffset.UtcNow.AddDays(7), TimeSpan.FromMinutes(1));
            _refreshTokenRepositoryMock.Verify(r => r.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task RefreshTokenAsync_WithActiveToken_AccessTokenShouldExpireAfterConfiguredMinutes()
        {
            // Arrange
            SetupOldToken(ActiveOldToken());
            SetupFindById(ActiveUser());

            // Act
            var result = await _authService.RefreshTokenAsync(OldTokenRequest());

            // Assert: the service was built with ExpiresInMinutes = 30
            result.Data!.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(30), TimeSpan.FromMinutes(1));
        }

        [Fact]
        public async Task RefreshTokenAsync_WhenExpiryNotConfigured_AccessTokenShouldExpireAfterSixtyMinutes()
        {
            // Arrange
            var service = CreateService(jwtExpiresInMinutes: 0);
            SetupOldToken(ActiveOldToken());
            SetupFindById(ActiveUser());

            // Act
            var result = await service.RefreshTokenAsync(OldTokenRequest());

            // Assert
            result.Data!.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(60), TimeSpan.FromMinutes(1));
        }

        [Fact]
        public async Task RefreshTokenAsync_WithUnknownExpiredOrRevokedToken_ShouldFail()
        {
            // Arrange: the repository only returns tokens that are still active
            SetupOldToken(null);

            // Act
            var result = await _authService.RefreshTokenAsync(OldTokenRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidRefreshToken);
            _userManagerMock.Verify(m => m.FindByIdAsync(It.IsAny<string>()), Times.Never);
            VerifyNoTokenIssued();
        }

        [Fact]
        public async Task RefreshTokenAsync_WhenUserDeleted_ShouldFailWithoutIssuingTokens()
        {
            // Arrange: the token is still active but its account no longer exists
            var oldToken = ActiveOldToken();
            SetupOldToken(oldToken);
            SetupFindById(null);

            // Act
            var result = await _authService.RefreshTokenAsync(OldTokenRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.UserNotFound);
            VerifyNoTokenIssued();
            _refreshTokenRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<UserRefreshToken>()), Times.Never);
        }

        #endregion

        #region ConfirmEmailAsync

        private const string RawEmailToken = "identity-email-token";

        // The confirmation link carries the Identity token encoded as Base64Url, like VerifyOtpAsync builds it
        private static string EncodeForLink(string token) =>
            WebEncoders.Base64UrlEncode(System.Text.Encoding.UTF8.GetBytes(token));

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
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.UserNotFound);
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
            result.Message.Should().StartWith("Invalid confirmation token");
            _userManagerMock.Verify(m => m.ConfirmEmailAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>()), Times.Never);
        }

        #endregion

        #region ForgotPasswordAsync

        private const string Phone = "0912345678";
        private const string NormalizedPhone = "+84912345678";

        private void SetupFindByPhone(ApplicationUser? user)
        {
            _registrationRepositoryMock
                .Setup(r => r.FindUserByPhoneAsync(It.IsAny<IReadOnlyCollection<string>>()))
                .ReturnsAsync(user);
        }

        private void VerifyNothingSentAndNoSessionSaved()
        {
            _smsSenderMock.Verify(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
            _emailSenderMock.Verify(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
            _passwordResetStoreMock.Verify(s => s.Save(It.IsAny<PasswordResetSession>(), It.IsAny<TimeSpan>()), Times.Never);
        }

        [Fact]
        public async Task ForgotPasswordAsync_WithEmail_ShouldSendCodeByEmailAndSaveSession()
        {
            // Arrange
            var user = ActiveUser();
            SetupFindByEmail(user);
            PasswordResetSession? saved = null;
            _passwordResetStoreMock
                .Setup(s => s.Save(It.IsAny<PasswordResetSession>(), It.IsAny<TimeSpan>()))
                .Callback<PasswordResetSession, TimeSpan>((session, _) => saved = session);

            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Email });

            // Assert: the code goes by email only
            result.Success.Should().BeTrue();
            result.Data!.VerificationMethod.Should().Be(VerificationMethodConstants.Email);
            _emailSenderMock.Verify(e => e.SendEmailAsync(Email, It.IsAny<string>(), It.IsAny<string>()), Times.Once);
            _smsSenderMock.Verify(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);

            // The session belongs to this user, is not verified yet and is returned to the client
            saved.Should().NotBeNull();
            saved!.UserId.Should().Be(user.Id);
            saved.IsOtpVerified.Should().BeFalse();
            saved.ResetToken.Should().BeNull();
            saved.OtpHash.Should().NotBeNullOrEmpty();
            result.Data.SessionId.Should().Be(saved.SessionId);
        }

        [Fact]
        public async Task ForgotPasswordAsync_WithPhone_ShouldSendCodeBySmsToNormalizedNumber()
        {
            // Arrange
            SetupFindByPhone(ActiveUser());

            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Phone });

            // Assert: the SMS goes to the +84 form, never by email
            result.Success.Should().BeTrue();
            result.Data!.VerificationMethod.Should().Be(VerificationMethodConstants.Sms);
            _smsSenderMock.Verify(s => s.SendSmsAsync(NormalizedPhone, It.IsAny<string>()), Times.Once);
            _emailSenderMock.Verify(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
            _passwordResetStoreMock.Verify(s => s.Save(It.IsAny<PasswordResetSession>(), It.IsAny<TimeSpan>()), Times.Once);
        }

        [Fact]
        public async Task ForgotPasswordAsync_ShouldMaskWhereTheCodeWasSent()
        {
            // Arrange
            SetupFindByEmail(ActiveUser());
            SetupFindByPhone(ActiveUser());

            // Act
            var byEmail = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Email });
            var byPhone = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Phone });

            // Assert: the full address or number is never sent back
            byEmail.Data!.MaskedDestination.Should().NotBe(Email).And.Contain("*").And.EndWith("@oze.vn");
            byPhone.Data!.MaskedDestination.Should().NotBe(NormalizedPhone).And.Contain("*");
        }

        [Fact]
        public async Task ForgotPasswordAsync_ShouldNotPutTheCodeInTheResponse()
        {
            // Arrange: capture the SMS to learn the real code
            SetupFindByPhone(ActiveUser());
            string? sms = null;
            _smsSenderMock
                .Setup(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()))
                .Callback<string, string>((_, message) => sms = message)
                .Returns(Task.CompletedTask);

            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Phone });

            // Assert: the 6-digit code reaches the phone but not the API response
            var code = System.Text.RegularExpressions.Regex.Match(sms!, @"\d{6}").Value;
            code.Should().HaveLength(6);
            System.Text.Json.JsonSerializer.Serialize(result).Should().NotContain(code);
        }

        [Fact]
        public async Task ForgotPasswordAsync_WithSpacesAroundEmail_ShouldTrim()
        {
            // Arrange
            SetupFindByEmail(ActiveUser());

            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = $"  {Email}  " });

            // Assert
            result.Success.Should().BeTrue();
            _emailSenderMock.Verify(e => e.SendEmailAsync(Email, It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        }

        [Theory]
        [InlineData("abc123")]
        [InlineData("091234567")]
        [InlineData("0112345678")]
        public async Task ForgotPasswordAsync_WithInvalidPhone_ShouldFailWithoutQueryingDatabase(string phone)
        {
            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = phone });

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidPhone);
            _registrationRepositoryMock.Verify(r => r.FindUserByPhoneAsync(It.IsAny<IReadOnlyCollection<string>>()), Times.Never);
            VerifyNothingSentAndNoSessionSaved();
        }

        [Fact]
        public async Task ForgotPasswordAsync_WhenEmailNotFound_ShouldFail()
        {
            // Arrange
            SetupFindByEmail(null);

            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Email });

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.UserNotFound);
            VerifyNothingSentAndNoSessionSaved();
        }

        [Fact]
        public async Task ForgotPasswordAsync_WhenPhoneNotFound_ShouldFail()
        {
            // Arrange
            SetupFindByPhone(null);

            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Phone });

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.UserNotFound);
            VerifyNothingSentAndNoSessionSaved();
        }

        [Fact]
        public async Task ForgotPasswordAsync_WhenRegistrationNotVerified_ShouldFail()
        {
            // Arrange: a patient who never finished OTP registration has no password to recover
            var user = PendingRegistrationUser();
            SetupFindByEmail(user);
            _userManagerMock.Setup(m => m.IsInRoleAsync(user, RoleConstants.PatientRole)).ReturnsAsync(true);

            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Email });

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.UserNotFound);
            VerifyNothingSentAndNoSessionSaved();
        }

        [Fact]
        public async Task ForgotPasswordAsync_WhenSmsFails_ShouldFailWithoutSavingSession()
        {
            // Arrange
            SetupFindByPhone(ActiveUser());
            _smsSenderMock
                .Setup(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()))
                .ThrowsAsync(new Exception("SMS gateway down"));

            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Phone });

            // Assert: a session nobody received a code for must not exist
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpSendFailed);
            _passwordResetStoreMock.Verify(s => s.Save(It.IsAny<PasswordResetSession>(), It.IsAny<TimeSpan>()), Times.Never);
        }

        [Fact]
        public async Task ForgotPasswordAsync_WhenEmailFails_ShouldFailWithoutSavingSession()
        {
            // Arrange
            SetupFindByEmail(ActiveUser());
            _emailSenderMock
                .Setup(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .ThrowsAsync(new Exception("Mail server down"));

            // Act
            var result = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Email });

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpSendFailed);
            _passwordResetStoreMock.Verify(s => s.Save(It.IsAny<PasswordResetSession>(), It.IsAny<TimeSpan>()), Times.Never);
        }

        #endregion

        #region VerifyResetOtpAsync

        private const string ResetSessionId = "reset-session-1";
        private const string CorrectOtp = "123456";
        private const string WrongOtp = "000000";
        private const string IdentityResetToken = "identity-reset-token";
        // RegisterOtpSettings defaults: 5 attempts, codes live 5 minutes
        private const int MaxOtpAttempts = 5;
        private const int OtpLifetimeMinutes = 5;

        // A session created by ForgotPasswordAsync whose correct code is 123456
        private static PasswordResetSession NewResetSession(int failedAttempts = 0, int expiresInMinutes = 3) => new()
        {
            SessionId = ResetSessionId,
            UserId = UserId,
            ExpiresAt = DateTime.UtcNow.AddMinutes(expiresInMinutes),
            OtpHash = OtpHelper.Hash(ResetSessionId, CorrectOtp),
            FailedAttempts = failedAttempts
        };

        private void SetupResetSession(PasswordResetSession? session)
        {
            _passwordResetStoreMock.Setup(s => s.Get(ResetSessionId)).Returns(session);
        }

        private static VerifyResetOtpRequest ResetOtpRequest(string otp) => new() { SessionId = ResetSessionId, Otp = otp };

        private void VerifyResetTokenNeverCreated()
        {
            _userManagerMock.Verify(m => m.GeneratePasswordResetTokenAsync(It.IsAny<ApplicationUser>()), Times.Never);
        }

        [Fact]
        public async Task VerifyResetOtpAsync_WithCorrectOtp_ShouldUnlockPasswordReset()
        {
            // Arrange
            var session = NewResetSession();
            var user = ActiveUser();
            SetupResetSession(session);
            SetupFindById(user);
            _userManagerMock.Setup(m => m.GeneratePasswordResetTokenAsync(user)).ReturnsAsync(IdentityResetToken);

            // Act
            var result = await _authService.VerifyResetOtpAsync(ResetOtpRequest(CorrectOtp));

            // Assert: the session now carries what ResetPasswordAsync checks for
            result.Success.Should().BeTrue();
            session.IsOtpVerified.Should().BeTrue();
            session.ResetToken.Should().Be(IdentityResetToken);
            _passwordResetStoreMock.Verify(s => s.Save(session, It.IsAny<TimeSpan>()), Times.Once);
        }

        [Fact]
        public async Task VerifyResetOtpAsync_WithCorrectOtp_ShouldGiveFreshTimeToTypeNewPassword()
        {
            // Arrange: only 1 minute left on the code
            var session = NewResetSession(expiresInMinutes: 1);
            var user = ActiveUser();
            SetupResetSession(session);
            SetupFindById(user);
            _userManagerMock.Setup(m => m.GeneratePasswordResetTokenAsync(user)).ReturnsAsync(IdentityResetToken);

            // Act
            await _authService.VerifyResetOtpAsync(ResetOtpRequest(CorrectOtp));

            // Assert
            session.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(OtpLifetimeMinutes), TimeSpan.FromSeconds(30));
        }

        [Fact]
        public async Task VerifyResetOtpAsync_WithSpacesAroundOtp_ShouldStillMatch()
        {
            // Arrange
            var session = NewResetSession();
            var user = ActiveUser();
            SetupResetSession(session);
            SetupFindById(user);
            _userManagerMock.Setup(m => m.GeneratePasswordResetTokenAsync(user)).ReturnsAsync(IdentityResetToken);

            // Act
            var result = await _authService.VerifyResetOtpAsync(ResetOtpRequest($" {CorrectOtp} "));

            // Assert
            result.Success.Should().BeTrue();
        }

        [Fact]
        public async Task VerifyResetOtpAsync_WhenSessionNotFound_ShouldFail()
        {
            // Arrange
            SetupResetSession(null);

            // Act
            var result = await _authService.VerifyResetOtpAsync(ResetOtpRequest(CorrectOtp));

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.ResetSessionInvalid);
            VerifyResetTokenNeverCreated();
        }

        [Fact]
        public async Task VerifyResetOtpAsync_WhenSessionExpired_ShouldFailEvenWithCorrectOtp()
        {
            // Arrange
            SetupResetSession(NewResetSession(expiresInMinutes: -1));

            // Act
            var result = await _authService.VerifyResetOtpAsync(ResetOtpRequest(CorrectOtp));

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.ResetSessionInvalid);
            VerifyResetTokenNeverCreated();
        }

        [Fact]
        public async Task VerifyResetOtpAsync_WithWrongOtp_ShouldCountFailedAttempt()
        {
            // Arrange
            var session = NewResetSession();
            SetupResetSession(session);

            // Act
            var result = await _authService.VerifyResetOtpAsync(ResetOtpRequest(WrongOtp));

            // Assert: the attempt is remembered and the session stays locked
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidOtp);
            session.FailedAttempts.Should().Be(1);
            session.IsOtpVerified.Should().BeFalse();
            _passwordResetStoreMock.Verify(s => s.Save(session, It.IsAny<TimeSpan>()), Times.Once);
            _passwordResetStoreMock.Verify(s => s.Remove(It.IsAny<string>()), Times.Never);
            VerifyResetTokenNeverCreated();
        }

        [Fact]
        public async Task VerifyResetOtpAsync_WithWrongOtpOnLastAttempt_ShouldDeleteSession()
        {
            // Arrange: one attempt left
            SetupResetSession(NewResetSession(failedAttempts: MaxOtpAttempts - 1));

            // Act
            var result = await _authService.VerifyResetOtpAsync(ResetOtpRequest(WrongOtp));

            // Assert: the user must request a new code
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.InvalidOtp);
            _passwordResetStoreMock.Verify(s => s.Remove(ResetSessionId), Times.Once);
            _passwordResetStoreMock.Verify(s => s.Save(It.IsAny<PasswordResetSession>(), It.IsAny<TimeSpan>()), Times.Never);
        }

        [Fact]
        public async Task VerifyResetOtpAsync_AfterTooManyWrongAttempts_ShouldRejectEvenCorrectOtp()
        {
            // Arrange: someone already guessed 5 times
            SetupResetSession(NewResetSession(failedAttempts: MaxOtpAttempts));

            // Act
            var result = await _authService.VerifyResetOtpAsync(ResetOtpRequest(CorrectOtp));

            // Assert: guessing is blocked, so the right code no longer works either
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.ResetSessionInvalid);
            _passwordResetStoreMock.Verify(s => s.Remove(ResetSessionId), Times.Once);
            VerifyResetTokenNeverCreated();
        }

        [Fact]
        public async Task VerifyResetOtpAsync_WhenUserDeleted_ShouldFailAndDeleteSession()
        {
            // Arrange: the code is right but the account no longer exists
            SetupResetSession(NewResetSession());
            SetupFindById(null);

            // Act
            var result = await _authService.VerifyResetOtpAsync(ResetOtpRequest(CorrectOtp));

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.UserNotFound);
            _passwordResetStoreMock.Verify(s => s.Remove(ResetSessionId), Times.Once);
            VerifyResetTokenNeverCreated();
        }

        #endregion

        #region ResetPasswordAsync

        private const string ResetNewPassword = "Reset@1234";

        // A session that already passed VerifyResetOtpAsync
        private static PasswordResetSession VerifiedResetSession()
        {
            var session = NewResetSession();
            session.IsOtpVerified = true;
            session.ResetToken = IdentityResetToken;
            return session;
        }

        private static ResetPasswordRequest NewPasswordRequest() => new()
        {
            SessionId = ResetSessionId,
            NewPassword = ResetNewPassword,
            ConfirmPassword = ResetNewPassword
        };

        private void SetupIdentityResetPassword(ApplicationUser user, IdentityResult result)
        {
            _userManagerMock
                .Setup(m => m.ResetPasswordAsync(user, IdentityResetToken, ResetNewPassword))
                .ReturnsAsync(result);
        }

        private void VerifyPasswordNeverReset()
        {
            _userManagerMock.Verify(
                m => m.ResetPasswordAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>(), It.IsAny<string>()),
                Times.Never);
        }

        [Fact]
        public async Task ResetPasswordAsync_WithVerifiedSession_ShouldSetNewPasswordAndSignOutAllDevices()
        {
            // Arrange
            var user = ActiveUser();
            SetupResetSession(VerifiedResetSession());
            SetupFindById(user);
            SetupIdentityResetPassword(user, IdentityResult.Success);

            // Act
            var result = await _authService.ResetPasswordAsync(NewPasswordRequest());

            // Assert: the session is used once, and old logins are cut off
            result.Success.Should().BeTrue();
            _userManagerMock.Verify(m => m.ResetPasswordAsync(user, IdentityResetToken, ResetNewPassword), Times.Once);
            _passwordResetStoreMock.Verify(s => s.Remove(ResetSessionId), Times.Once);
            _refreshTokenRepositoryMock.Verify(r => r.RevokeUserTokensAsync(user.Id), Times.Once);
            _refreshTokenRepositoryMock.Verify(r => r.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task ResetPasswordAsync_WhenSessionNotFound_ShouldFail()
        {
            // Arrange
            SetupResetSession(null);

            // Act
            var result = await _authService.ResetPasswordAsync(NewPasswordRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.ResetSessionInvalid);
            VerifyPasswordNeverReset();
        }

        [Fact]
        public async Task ResetPasswordAsync_WhenOtpNotVerifiedYet_ShouldFail()
        {
            // Arrange: the user skipped the OTP step
            SetupResetSession(NewResetSession());

            // Act
            var result = await _authService.ResetPasswordAsync(NewPasswordRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.ResetSessionInvalid);
            VerifyPasswordNeverReset();
        }

        [Fact]
        public async Task ResetPasswordAsync_WhenResetTokenMissing_ShouldFail()
        {
            // Arrange: marked verified but Identity never issued a token
            var session = VerifiedResetSession();
            session.ResetToken = null;
            SetupResetSession(session);

            // Act
            var result = await _authService.ResetPasswordAsync(NewPasswordRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.ResetSessionInvalid);
            VerifyPasswordNeverReset();
        }

        [Fact]
        public async Task ResetPasswordAsync_WhenSessionExpired_ShouldFail()
        {
            // Arrange
            var session = VerifiedResetSession();
            session.ExpiresAt = DateTime.UtcNow.AddMinutes(-1);
            SetupResetSession(session);

            // Act
            var result = await _authService.ResetPasswordAsync(NewPasswordRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.ResetSessionInvalid);
            VerifyPasswordNeverReset();
        }

        [Fact]
        public async Task ResetPasswordAsync_WhenUserDeleted_ShouldFailAndDeleteSession()
        {
            // Arrange
            SetupResetSession(VerifiedResetSession());
            SetupFindById(null);

            // Act
            var result = await _authService.ResetPasswordAsync(NewPasswordRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.UserNotFound);
            _passwordResetStoreMock.Verify(s => s.Remove(ResetSessionId), Times.Once);
            VerifyPasswordNeverReset();
        }

        [Fact]
        public async Task ResetPasswordAsync_WhenPasswordBreaksPolicy_ShouldKeepSessionForRetry()
        {
            // Arrange: Identity rejects a weak password
            var user = ActiveUser();
            SetupResetSession(VerifiedResetSession());
            SetupFindById(user);
            SetupIdentityResetPassword(user, IdentityResult.Failed(
                new IdentityError { Code = "PasswordTooShort", Description = "Passwords must be at least 8 characters." }));

            // Act
            var result = await _authService.ResetPasswordAsync(NewPasswordRequest());

            // Assert: the user can try again without a new code
            result.Success.Should().BeFalse();
            result.Message.Should().Be("Reset password failed");
            result.Errors.Should().Contain("Passwords must be at least 8 characters.");
            _passwordResetStoreMock.Verify(s => s.Remove(It.IsAny<string>()), Times.Never);
            _refreshTokenRepositoryMock.Verify(r => r.RevokeUserTokensAsync(It.IsAny<string>()), Times.Never);
        }

        #endregion

        #region Password recovery - whole flow

        [Fact]
        public async Task PasswordRecovery_ForgotThenVerifyThenReset_ShouldSucceed()
        {
            // Arrange: a store that really keeps sessions between the three calls
            var sessions = new Dictionary<string, PasswordResetSession>();
            _passwordResetStoreMock
                .Setup(s => s.Save(It.IsAny<PasswordResetSession>(), It.IsAny<TimeSpan>()))
                .Callback<PasswordResetSession, TimeSpan>((session, _) => sessions[session.SessionId] = session);
            _passwordResetStoreMock
                .Setup(s => s.Get(It.IsAny<string>()))
                .Returns<string>(id => sessions.GetValueOrDefault(id));
            _passwordResetStoreMock
                .Setup(s => s.Remove(It.IsAny<string>()))
                .Callback<string>(id => sessions.Remove(id));

            var user = ActiveUser();
            SetupFindByPhone(user);
            SetupFindById(user);
            _userManagerMock.Setup(m => m.GeneratePasswordResetTokenAsync(user)).ReturnsAsync(IdentityResetToken);
            _userManagerMock
                .Setup(m => m.ResetPasswordAsync(user, IdentityResetToken, ResetNewPassword))
                .ReturnsAsync(IdentityResult.Success);

            string? sms = null;
            _smsSenderMock
                .Setup(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()))
                .Callback<string, string>((_, message) => sms = message)
                .Returns(Task.CompletedTask);

            // Act 1: ask for a code
            var forgot = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Phone });
            var sessionId = forgot.Data!.SessionId;
            var codeFromSms = System.Text.RegularExpressions.Regex.Match(sms!, @"\d{6}").Value;

            // Act 2: type the code from the SMS
            var verify = await _authService.VerifyResetOtpAsync(new VerifyResetOtpRequest { SessionId = sessionId, Otp = codeFromSms });

            // Act 3: choose a new password
            var reset = await _authService.ResetPasswordAsync(new ResetPasswordRequest
            {
                SessionId = sessionId,
                NewPassword = ResetNewPassword,
                ConfirmPassword = ResetNewPassword
            });

            // Assert: every step passes and the session cannot be reused
            forgot.Success.Should().BeTrue();
            verify.Success.Should().BeTrue();
            reset.Success.Should().BeTrue();
            sessions.Should().NotContainKey(sessionId);
        }

        [Fact]
        public async Task PasswordRecovery_SkippingOtpStep_ShouldNotResetPassword()
        {
            // Arrange: the store keeps the session from step 1
            var sessions = new Dictionary<string, PasswordResetSession>();
            _passwordResetStoreMock
                .Setup(s => s.Save(It.IsAny<PasswordResetSession>(), It.IsAny<TimeSpan>()))
                .Callback<PasswordResetSession, TimeSpan>((session, _) => sessions[session.SessionId] = session);
            _passwordResetStoreMock
                .Setup(s => s.Get(It.IsAny<string>()))
                .Returns<string>(id => sessions.GetValueOrDefault(id));
            SetupFindByPhone(ActiveUser());

            // Act: go straight from step 1 to step 3
            var forgot = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = Phone });
            var reset = await _authService.ResetPasswordAsync(new ResetPasswordRequest
            {
                SessionId = forgot.Data!.SessionId,
                NewPassword = ResetNewPassword,
                ConfirmPassword = ResetNewPassword
            });

            // Assert: knowing the session id is not enough without the code
            reset.Success.Should().BeFalse();
            reset.Message.Should().Be(ErrorConstants.AuthMessage.ResetSessionInvalid);
            VerifyPasswordNeverReset();
        }

        #endregion

        #region RegisterAsync

        private const string RegisterPassword = "Test@1234";
        private const string BaseUrl = "https://oze.test";

        private static RegisterRequest ValidRegisterRequest(string method = VerificationMethodConstants.Sms) => new()
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
        private void SetupIdentityWritesSucceed()
        {
            _userManagerMock.Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>())).ReturnsAsync(IdentityResult.Success);
            _userManagerMock.Setup(m => m.UpdateAsync(It.IsAny<ApplicationUser>())).ReturnsAsync(IdentityResult.Success);
            _userManagerMock.Setup(m => m.AddToRoleAsync(It.IsAny<ApplicationUser>(), RoleConstants.PatientRole)).ReturnsAsync(IdentityResult.Success);
        }

        private void VerifyNoAccountSaved()
        {
            _userManagerMock.Verify(m => m.CreateAsync(It.IsAny<ApplicationUser>()), Times.Never);
            _userManagerMock.Verify(m => m.UpdateAsync(It.IsAny<ApplicationUser>()), Times.Never);
        }

        private void VerifyNoOtpSentAndNoPendingSaved()
        {
            _smsSenderMock.Verify(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
            _emailSenderMock.Verify(e => e.SendRegistrationOtpAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>()), Times.Never);
            _pendingStoreMock.Verify(s => s.Save(It.IsAny<PendingRegistration>(), It.IsAny<TimeSpan>()), Times.Never);
        }

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

        #endregion

        #region ResendOtpAsync and VerifyOtpAsync - shared helpers

        private const string RegisterSessionId = "register-session-1";
        private const string AccountStamp = "stamp-1";

        // The locked account RegisterAsync created and the session pointing at it
        private static ApplicationUser UnverifiedAccount() => new()
        {
            Id = "user-new",
            PhoneNumber = NormalizedPhone,
            SecurityStamp = AccountStamp,
            PhoneNumberConfirmed = false,
            EmailConfirmed = false,
            LockoutEnd = DateTimeOffset.MaxValue
        };

        private static PendingRegistration NewPending(
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

        private void SetupPending(PendingRegistration? pending)
        {
            _pendingStoreMock.Setup(s => s.Get(RegisterSessionId)).Returns(pending);
        }

        private void SetupUnverifiedAccount(ApplicationUser? account)
        {
            _userManagerMock.Setup(m => m.FindByIdAsync("user-new")).ReturnsAsync(account);
            if (account != null)
            {
                _userManagerMock.Setup(m => m.IsInRoleAsync(account, RoleConstants.PatientRole)).ReturnsAsync(true);
            }
        }

        #endregion

        #region ResendOtpAsync

        private static ResendOtpRequest ResendRequest() => new() { SessionId = RegisterSessionId };

        [Fact]
        public async Task ResendOtpAsync_AfterCooldown_ShouldSendNewCodeAndRestartSession()
        {
            // Arrange: the old code was sent 2 minutes ago and was typed wrong twice
            var pending = NewPending(failedAttempts: 2, expiresInMinutes: 1);
            var oldHash = pending.OtpHash;
            SetupPending(pending);
            SetupUnverifiedAccount(UnverifiedAccount());

            // Act
            var result = await _authService.ResendOtpAsync(ResendRequest());

            // Assert: a new code, a fresh time window and a clean attempt counter
            result.Success.Should().BeTrue();
            pending.OtpHash.Should().NotBe(oldHash);
            pending.FailedAttempts.Should().Be(0);
            pending.LastSentAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(30));
            pending.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(OtpLifetimeMinutes), TimeSpan.FromSeconds(30));
            _smsSenderMock.Verify(s => s.SendSmsAsync(NormalizedPhone, It.IsAny<string>()), Times.Once);
            _pendingStoreMock.Verify(s => s.Save(pending, It.IsAny<TimeSpan>()), Times.Once);
        }

        [Fact]
        public async Task ResendOtpAsync_TooSoon_ShouldFail()
        {
            // Arrange: the last code was sent 10 seconds ago (cooldown is 60 seconds)
            SetupPending(NewPending(sentSecondsAgo: 10));

            // Act
            var result = await _authService.ResendOtpAsync(ResendRequest());
                
            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpResendTooSoon);
            _smsSenderMock.Verify(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task ResendOtpAsync_WhenSessionNotFound_ShouldFail()
        {
            // Arrange
            SetupPending(null);

            // Act
            var result = await _authService.ResendOtpAsync(ResendRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpExpired);
        }

        [Fact]
        public async Task ResendOtpAsync_WhenSessionExpired_ShouldFail()
        {
            // Arrange
            SetupPending(NewPending(expiresInMinutes: -1));

            // Act
            var result = await _authService.ResendOtpAsync(ResendRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpExpired);
            _smsSenderMock.Verify(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task ResendOtpAsync_WhenUserRegisteredAgain_ShouldDropOldSession()
        {
            // Arrange: a later sign-up changed the security stamp, so this session is stale
            var account = UnverifiedAccount();
            account.SecurityStamp = "stamp-2";
            SetupPending(NewPending());
            SetupUnverifiedAccount(account);

            // Act
            var result = await _authService.ResendOtpAsync(ResendRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpExpired);
            _pendingStoreMock.Verify(s => s.Remove(RegisterSessionId), Times.Once);
            _smsSenderMock.Verify(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task ResendOtpAsync_WhenSmsFails_ShouldKeepOldCodeValid()
        {
            // Arrange
            var pending = NewPending();
            var oldHash = pending.OtpHash;
            SetupPending(pending);
            SetupUnverifiedAccount(UnverifiedAccount());
            _smsSenderMock
                .Setup(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()))
                .ThrowsAsync(new Exception("SMS gateway down"));

            // Act
            var result = await _authService.ResendOtpAsync(ResendRequest());

            // Assert: the code the user already has still works
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.AuthMessage.OtpSendFailed);
            pending.OtpHash.Should().Be(oldHash);
            _pendingStoreMock.Verify(s => s.Save(It.IsAny<PendingRegistration>(), It.IsAny<TimeSpan>()), Times.Never);
        }

        #endregion

        #region VerifyOtpAsync

        private static VerifyOtpRequest RegisterOtpRequest(string otp) => new() { SessionId = RegisterSessionId, Otp = otp };

        private void SetupWalkInPatients(params Patient[] patients)
        {
            _registrationRepositoryMock
                .Setup(r => r.FindUnlinkedPatientsByPhoneAsync(It.IsAny<IReadOnlyCollection<string>>()))
                .ReturnsAsync(patients.ToList());
        }

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

        #endregion

        #region Registration - whole flow

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

        #endregion
    }
}
