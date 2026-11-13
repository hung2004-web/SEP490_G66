using FluentAssertions;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using Xunit;

namespace OZE.UnitTest.Services.Caching
{
    // The stores keep their values as JSON in IDistributedCache (Redis in production, memory here),
    // so a value read back is a copy: these tests check the round trip and the time limits.
    [Trait("Tab", "OZ-CACHE-01")]
    public class DistributedStoreTests
    {
        private readonly IDistributedCache _cache = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));

        // UTCID01 (N): a registration comes back with every field, dates kept in UTC
        [Fact]
        public void PendingRegistration_SaveThenGet_RoundTrips()
        {
            var store = new PendingRegistrationStore(_cache);
            var expiresAt = DateTime.UtcNow.AddMinutes(5);
            store.Save(new PendingRegistration
            {
                SessionId = "s1",
                UserId = "u1",
                FullName = "Nguyen Van A",
                DateOfBirth = new DateOnly(2000, 1, 2),
                PhoneNumber = "0900000000",
                OtpHash = "hash",
                ExpiresAt = expiresAt,
                FailedAttempts = 2
            }, TimeSpan.FromMinutes(5));

            var result = store.Get("s1");

            result.Should().NotBeNull();
            result!.FullName.Should().Be("Nguyen Van A");
            result.DateOfBirth.Should().Be(new DateOnly(2000, 1, 2));
            result.FailedAttempts.Should().Be(2);
            result.ExpiresAt.Should().Be(expiresAt);
            result.ExpiresAt.Kind.Should().Be(DateTimeKind.Utc);
        }

        // UTCID02 (B): a session saved with no time left is not kept
        [Fact]
        public void PasswordReset_SaveWithNoTimeLeft_RemovesIt()
        {
            var store = new PasswordResetStore(_cache);
            store.Save(new PasswordResetSession { SessionId = "r1", UserId = "u1" }, TimeSpan.FromMinutes(5));

            store.Save(new PasswordResetSession { SessionId = "r1", UserId = "u1" }, TimeSpan.Zero);

            store.Get("r1").Should().BeNull();
        }

        // UTCID03 (N): a removed profile change is gone
        [Fact]
        public void PendingProfileUpdate_Remove_DeletesIt()
        {
            var store = new PendingProfileUpdateStore(_cache);
            store.Save(new PendingProfileUpdate { SessionId = "p1", PhoneNumber = "0900000001" }, TimeSpan.FromMinutes(5));

            store.Remove("p1");

            store.Get("p1").Should().BeNull();
        }

        // UTCID04 (N): a signed-out token is refused until it expires; others are not
        [Fact]
        public void TokenRevocation_RevokedTokenIsRefused()
        {
            var store = new AccessTokenRevocationStore(_cache);

            store.Revoke("jti-1", DateTimeOffset.UtcNow.AddMinutes(30));
            store.Revoke("jti-old", DateTimeOffset.UtcNow.AddMinutes(-1));

            store.IsRevoked("jti-1").Should().BeTrue();
            store.IsRevoked("jti-old").Should().BeFalse();
            store.IsRevoked("jti-2").Should().BeFalse();
        }

        // UTCID05 (A): one more code than allowed in the window is refused; another contact is counted apart
        [Fact]
        public void OtpSendLimiter_OverTheLimit_Throws()
        {
            var limiter = new OtpSendLimiter(_cache);
            for (var i = 0; i < SecurityConstants.OtpSendsPerWindow; i++)
            {
                limiter.EnsureCanSend("register", "0900000000");
            }

            var act = () => limiter.EnsureCanSend("register", " 0900000000 ");

            act.Should().Throw<TooManyRequestsException>();
            limiter.Invoking(l => l.EnsureCanSend("register", "0900000009")).Should().NotThrow();
        }
    }
}
