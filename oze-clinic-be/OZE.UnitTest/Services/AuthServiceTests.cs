using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
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
                Mock.Of<IEmailSender>(),
                Mock.Of<ISmsSender>(),
                Mock.Of<IPendingRegistrationStore>(),
                Mock.Of<IPasswordResetStore>(),
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
    }
}
