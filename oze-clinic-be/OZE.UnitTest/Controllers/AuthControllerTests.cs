using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.ProjectBase.Controllers;
using Xunit;

namespace OZE.UnitTest.Controllers
{
    public class AuthControllerTests
    {
        private const string UserId = "user-test-id";
        private const string BaseUrl = "https://api.oze.test";

        private readonly Mock<IAuthService> _authServiceMock;
        private readonly AuthController _controller;

        public AuthControllerTests()
        {
            _authServiceMock = new Mock<IAuthService>();
            _controller = new AuthController(_authServiceMock.Object);
            SetUser(new Claim(ClaimTypes.NameIdentifier, UserId));
        }

        // Puts a signed-in user (or nobody, with no claims) and the request host on the controller
        private void SetUser(params Claim[] claims)
        {
            var httpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"))
            };
            httpContext.Request.Scheme = "https";
            httpContext.Request.Host = new HostString("api.oze.test");
            _controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        }

        private static ApiResponse<AuthResult> TokensResult() =>
            ApiResponse<AuthResult>.SuccessResult(new AuthResult { Token = "access-token", RefreshToken = "refresh-token" });

        private static ApiResponse<RegisterPendingResponse> PendingResult() =>
            ApiResponse<RegisterPendingResponse>.SuccessResult(new RegisterPendingResponse { SessionId = "session-1" });

        #region Login

        [Fact]
        public async Task LoginAsync_WhenServiceSucceeds_ShouldReturnOkWithTokens()
        {
            // Arrange
            var request = new LoginRequest { Identifier = "0912345678", Password = "Test@123" };
            _authServiceMock.Setup(s => s.LoginAsync(request)).ReturnsAsync(TokensResult());

            // Act
            var actionResult = await _controller.LoginAsync(request);

            // Assert
            var ok = actionResult.Result.Should().BeOfType<OkObjectResult>().Subject;
            ok.Value.As<ApiResponse<AuthResult>>().Data!.Token.Should().Be("access-token");
        }

        [Fact]
        public async Task LoginAsync_WhenServiceFails_ShouldReturnBadRequestWithMessage()
        {
            // Arrange
            _authServiceMock
                .Setup(s => s.LoginAsync(It.IsAny<LoginRequest>()))
                .ReturnsAsync(ApiResponse<AuthResult>.FailureResult(ErrorConstants.AuthMessage.InvalidLogin));

            // Act
            var actionResult = await _controller.LoginAsync(new LoginRequest { Identifier = "a@oze.vn", Password = "wrong" });

            // Assert
            var badRequest = actionResult.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.As<ApiResponse<AuthResult>>().Message.Should().Be(ErrorConstants.AuthMessage.InvalidLogin);
        }

        #endregion

        #region Refresh token

        [Fact]
        public async Task RefreshTokenAsync_WhenServiceSucceeds_ShouldReturnOk()
        {
            // Arrange
            var request = new RefreshTokenRequest { RefreshToken = "old-refresh-token" };
            _authServiceMock.Setup(s => s.RefreshTokenAsync(request)).ReturnsAsync(TokensResult());

            // Act
            var actionResult = await _controller.RefreshTokenAsync(request);

            // Assert
            actionResult.Result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task RefreshTokenAsync_WhenTokenInvalid_ShouldReturnBadRequest()
        {
            // Arrange
            _authServiceMock
                .Setup(s => s.RefreshTokenAsync(It.IsAny<RefreshTokenRequest>()))
                .ReturnsAsync(ApiResponse<AuthResult>.FailureResult(ErrorConstants.AuthMessage.InvalidRefreshToken));

            // Act
            var actionResult = await _controller.RefreshTokenAsync(new RefreshTokenRequest { RefreshToken = "unknown" });

            // Assert
            actionResult.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        #endregion

        #region Logout

        [Fact]
        public async Task LogoutAsync_WithRefreshToken_ShouldSignOutThatDeviceOfCurrentUser()
        {
            // Arrange
            _authServiceMock.Setup(s => s.LogoutAsync(UserId, "device-token")).ReturnsAsync(ApiResponse.SuccessResult());

            // Act
            var actionResult = await _controller.LogoutAsync(new RefreshTokenRequest { RefreshToken = "device-token" });

            // Assert: the user id comes from the token, never from the request body
            actionResult.Result.Should().BeOfType<OkObjectResult>();
            _authServiceMock.Verify(s => s.LogoutAsync(UserId, "device-token"), Times.Once);
        }

        [Fact]
        public async Task LogoutAsync_WithoutBody_ShouldSignOutAllDevices()
        {
            // Arrange
            _authServiceMock.Setup(s => s.LogoutAsync(UserId, null)).ReturnsAsync(ApiResponse.SuccessResult());

            // Act
            var actionResult = await _controller.LogoutAsync();

            // Assert
            actionResult.Result.Should().BeOfType<OkObjectResult>();
            _authServiceMock.Verify(s => s.LogoutAsync(UserId, null), Times.Once);
        }

        [Fact]
        public async Task LogoutAsync_WhenTokenUsesSubClaim_ShouldReadUserIdFromIt()
        {
            // Arrange: some tokens carry the user id as "sub" instead of NameIdentifier
            SetUser(new Claim("sub", "sub-user-id"));
            _authServiceMock.Setup(s => s.LogoutAsync("sub-user-id", null)).ReturnsAsync(ApiResponse.SuccessResult());

            // Act
            await _controller.LogoutAsync();

            // Assert
            _authServiceMock.Verify(s => s.LogoutAsync("sub-user-id", null), Times.Once);
        }

        [Fact]
        public async Task LogoutAsync_WhenUserIdMissing_ShouldReturnUnauthorized()
        {
            // Arrange: a token without any user id
            SetUser();

            // Act
            var actionResult = await _controller.LogoutAsync();

            // Assert
            actionResult.Result.Should().BeOfType<UnauthorizedObjectResult>();
            _authServiceMock.Verify(s => s.LogoutAsync(It.IsAny<string>(), It.IsAny<string?>()), Times.Never);
        }

        #endregion

        #region Change password

        [Fact]
        public async Task ChangePasswordAsync_WhenServiceSucceeds_ShouldReturnOkForCurrentUser()
        {
            // Arrange
            var request = new ChangePasswordRequest { CurrentPassword = "Old@1234", NewPassword = "New@1234", ConfirmPassword = "New@1234" };
            _authServiceMock.Setup(s => s.ChangePasswordAsync(UserId, request)).ReturnsAsync(ApiResponse.SuccessResult());

            // Act
            var actionResult = await _controller.ChangePasswordAsync(request);

            // Assert
            actionResult.Result.Should().BeOfType<OkObjectResult>();
            _authServiceMock.Verify(s => s.ChangePasswordAsync(UserId, request), Times.Once);
        }

        [Fact]
        public async Task ChangePasswordAsync_WhenServiceFails_ShouldReturnBadRequest()
        {
            // Arrange
            _authServiceMock
                .Setup(s => s.ChangePasswordAsync(UserId, It.IsAny<ChangePasswordRequest>()))
                .ReturnsAsync(ApiResponse.FailureResult(ErrorConstants.AuthMessage.SamePassword));

            // Act
            var actionResult = await _controller.ChangePasswordAsync(new ChangePasswordRequest());

            // Assert
            actionResult.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task ChangePasswordAsync_WhenUserIdMissing_ShouldReturnUnauthorized()
        {
            // Arrange
            SetUser();

            // Act
            var actionResult = await _controller.ChangePasswordAsync(new ChangePasswordRequest());

            // Assert
            actionResult.Result.Should().BeOfType<UnauthorizedObjectResult>();
            _authServiceMock.Verify(s => s.ChangePasswordAsync(It.IsAny<string>(), It.IsAny<ChangePasswordRequest>()), Times.Never);
        }

        #endregion

        #region Register and OTP

        [Fact]
        public async Task RegisterAsync_ShouldPassRequestBaseUrlToService()
        {
            // Arrange: the base URL is used to build the email confirmation link
            var request = new RegisterRequest { FullName = "Nguyen Van A" };
            _authServiceMock.Setup(s => s.RegisterAsync(request, BaseUrl)).ReturnsAsync(PendingResult());

            // Act
            var actionResult = await _controller.RegisterAsync(request);

            // Assert
            actionResult.Result.Should().BeOfType<OkObjectResult>();
            _authServiceMock.Verify(s => s.RegisterAsync(request, BaseUrl), Times.Once);
        }

        [Fact]
        public async Task RegisterAsync_WhenServiceFails_ShouldReturnBadRequest()
        {
            // Arrange
            _authServiceMock
                .Setup(s => s.RegisterAsync(It.IsAny<RegisterRequest>(), It.IsAny<string>()))
                .ReturnsAsync(ApiResponse<RegisterPendingResponse>.FailureResult(ErrorConstants.AuthMessage.InvalidPhone));

            // Act
            var actionResult = await _controller.RegisterAsync(new RegisterRequest());

            // Assert
            actionResult.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task VerifyOtpAsync_ShouldPassRequestBaseUrlToService()
        {
            // Arrange
            var request = new VerifyOtpRequest { SessionId = "session-1", Otp = "123456" };
            _authServiceMock.Setup(s => s.VerifyOtpAsync(request, BaseUrl)).ReturnsAsync(ApiResponse.SuccessResult());

            // Act
            var actionResult = await _controller.VerifyOtpAsync(request);

            // Assert
            actionResult.Result.Should().BeOfType<OkObjectResult>();
            _authServiceMock.Verify(s => s.VerifyOtpAsync(request, BaseUrl), Times.Once);
        }

        [Fact]
        public async Task VerifyOtpAsync_WhenOtpInvalid_ShouldReturnBadRequest()
        {
            // Arrange
            _authServiceMock
                .Setup(s => s.VerifyOtpAsync(It.IsAny<VerifyOtpRequest>(), It.IsAny<string>()))
                .ReturnsAsync(ApiResponse.FailureResult(ErrorConstants.AuthMessage.InvalidOtp));

            // Act
            var actionResult = await _controller.VerifyOtpAsync(new VerifyOtpRequest { SessionId = "session-1", Otp = "000000" });

            // Assert
            actionResult.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task ResendOtpAsync_WhenServiceSucceeds_ShouldReturnOk()
        {
            // Arrange
            var request = new ResendOtpRequest { SessionId = "session-1" };
            _authServiceMock.Setup(s => s.ResendOtpAsync(request)).ReturnsAsync(PendingResult());

            // Act
            var actionResult = await _controller.ResendOtpAsync(request);

            // Assert
            actionResult.Result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task ResendOtpAsync_WhenTooSoon_ShouldReturnBadRequest()
        {
            // Arrange
            _authServiceMock
                .Setup(s => s.ResendOtpAsync(It.IsAny<ResendOtpRequest>()))
                .ReturnsAsync(ApiResponse<RegisterPendingResponse>.FailureResult(ErrorConstants.AuthMessage.OtpResendTooSoon));

            // Act
            var actionResult = await _controller.ResendOtpAsync(new ResendOtpRequest { SessionId = "session-1" });

            // Assert
            actionResult.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task ConfirmEmailAsync_WhenServiceSucceeds_ShouldReturnOk()
        {
            // Arrange
            _authServiceMock.Setup(s => s.ConfirmEmailAsync(UserId, "code")).ReturnsAsync(ApiResponse.SuccessResult());

            // Act
            var actionResult = await _controller.ConfirmEmailAsync(UserId, "code");

            // Assert
            actionResult.Result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task ConfirmEmailAsync_WhenCodeInvalid_ShouldReturnBadRequest()
        {
            // Arrange
            _authServiceMock
                .Setup(s => s.ConfirmEmailAsync(UserId, "bad-code"))
                .ReturnsAsync(ApiResponse.FailureResult("Email confirmation failed"));

            // Act
            var actionResult = await _controller.ConfirmEmailAsync(UserId, "bad-code");

            // Assert
            actionResult.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        #endregion

        #region Password recovery

        [Fact]
        public async Task ForgotPasswordAsync_WhenServiceSucceeds_ShouldReturnOkWithSession()
        {
            // Arrange
            var request = new ForgotPasswordRequest { Identifier = "0912345678" };
            _authServiceMock.Setup(s => s.ForgotPasswordAsync(request)).ReturnsAsync(PendingResult());

            // Act
            var actionResult = await _controller.ForgotPasswordAsync(request);

            // Assert: the client needs the session id for the next two steps
            var ok = actionResult.Result.Should().BeOfType<OkObjectResult>().Subject;
            ok.Value.As<ApiResponse<RegisterPendingResponse>>().Data!.SessionId.Should().Be("session-1");
        }

        [Fact]
        public async Task ForgotPasswordAsync_WhenUserNotFound_ShouldReturnBadRequest()
        {
            // Arrange
            _authServiceMock
                .Setup(s => s.ForgotPasswordAsync(It.IsAny<ForgotPasswordRequest>()))
                .ReturnsAsync(ApiResponse<RegisterPendingResponse>.FailureResult(ErrorConstants.AuthMessage.UserNotFound));

            // Act
            var actionResult = await _controller.ForgotPasswordAsync(new ForgotPasswordRequest { Identifier = "nobody@oze.vn" });

            // Assert
            actionResult.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task VerifyResetOtpAsync_WhenOtpCorrect_ShouldReturnOk()
        {
            // Arrange
            var request = new VerifyResetOtpRequest { SessionId = "session-1", Otp = "123456" };
            _authServiceMock.Setup(s => s.VerifyResetOtpAsync(request)).ReturnsAsync(ApiResponse.SuccessResult());

            // Act
            var actionResult = await _controller.VerifyResetOtpAsync(request);

            // Assert
            actionResult.Result.Should().BeOfType<OkObjectResult>();
            _authServiceMock.Verify(s => s.VerifyResetOtpAsync(request), Times.Once);
        }

        [Fact]
        public async Task VerifyResetOtpAsync_WhenOtpWrong_ShouldReturnBadRequest()
        {
            // Arrange
            _authServiceMock
                .Setup(s => s.VerifyResetOtpAsync(It.IsAny<VerifyResetOtpRequest>()))
                .ReturnsAsync(ApiResponse.FailureResult(ErrorConstants.AuthMessage.InvalidOtp));

            // Act
            var actionResult = await _controller.VerifyResetOtpAsync(new VerifyResetOtpRequest { SessionId = "session-1", Otp = "000000" });

            // Assert
            actionResult.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task ResetPasswordAsync_WhenServiceSucceeds_ShouldReturnOk()
        {
            // Arrange
            var request = new ResetPasswordRequest { SessionId = "session-1", NewPassword = "New@1234", ConfirmPassword = "New@1234" };
            _authServiceMock.Setup(s => s.ResetPasswordAsync(request)).ReturnsAsync(ApiResponse.SuccessResult());

            // Act
            var actionResult = await _controller.ResetPasswordAsync(request);

            // Assert
            actionResult.Result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task ResetPasswordAsync_WhenSessionInvalid_ShouldReturnBadRequest()
        {
            // Arrange
            _authServiceMock
                .Setup(s => s.ResetPasswordAsync(It.IsAny<ResetPasswordRequest>()))
                .ReturnsAsync(ApiResponse.FailureResult(ErrorConstants.AuthMessage.ResetSessionInvalid));

            // Act
            var actionResult = await _controller.ResetPasswordAsync(new ResetPasswordRequest { SessionId = "expired" });

            // Assert
            actionResult.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        #endregion
    }
}
