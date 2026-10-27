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

        // The real class under test
        private readonly AuthService _authService;

        public AuthServiceTests()
        {
            // UserManager is a class, not an interface, so Moq needs its constructor arguments.
            // Only the first one (the user store) matters; the other 8 can be null.
            _userManagerMock = new Mock<UserManager<ApplicationUser>>(
                Mock.Of<IUserStore<ApplicationUser>>(), null!, null!, null!, null!, null!, null!, null!, null!);

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
                Mock.Of<IPendingRegistrationStore>(),
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
    }
}
