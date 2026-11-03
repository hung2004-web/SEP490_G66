using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using Xunit;

namespace OZE.UnitTest.Services
{
    public class OtpSendLimiterTests
    {
        private readonly OtpSendLimiter _limiter = new(new MemoryCache(new MemoryCacheOptions()));

        [Fact]
        public void EnsureCanSend_UpToTheLimit_ShouldAllow()
        {
            // Act
            var act = () =>
            {
                for (var i = 0; i < SecurityConstants.OtpSendsPerWindow; i++)
                {
                    _limiter.EnsureCanSend("0399000977");
                }
            };

            // Assert
            act.Should().NotThrow();
        }

        [Fact]
        public void EnsureCanSend_OverTheLimit_ShouldThrowTooManyRequests()
        {
            // Arrange
            for (var i = 0; i < SecurityConstants.OtpSendsPerWindow; i++)
            {
                _limiter.EnsureCanSend("someone@example.test");
            }

            // Act: the same email written in other case still counts
            var act = () => _limiter.EnsureCanSend(" SomeOne@Example.test ");

            // Assert
            act.Should().Throw<TooManyRequestsException>().WithMessage(ErrorConstants.AuthMessage.OtpTooManyRequests);
        }

        [Fact]
        public void EnsureCanSend_ForAnotherContact_ShouldNotBeAffected()
        {
            // Arrange
            for (var i = 0; i < SecurityConstants.OtpSendsPerWindow; i++)
            {
                _limiter.EnsureCanSend("0399000977");
            }

            // Act
            var act = () => _limiter.EnsureCanSend("0399000978");

            // Assert
            act.Should().NotThrow();
        }
    }
}
