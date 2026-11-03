using Microsoft.Extensions.Caching.Memory;
using OZE.Application.Interfaces;

namespace OZE.Application.Services
{
    // In memory, like the OTP sessions: kept only until the token would have expired anyway
    public class AccessTokenRevocationStore : IAccessTokenRevocationStore
    {
        private readonly IMemoryCache _cache;

        public AccessTokenRevocationStore(IMemoryCache cache)
        {
            _cache = cache;
        }

        public void Revoke(string tokenId, DateTimeOffset expiresAt)
        {
            if (expiresAt > DateTimeOffset.UtcNow)
            {
                _cache.Set(Key(tokenId), true, expiresAt);
            }
        }

        public bool IsRevoked(string tokenId) => _cache.TryGetValue(Key(tokenId), out _);

        private static string Key(string tokenId) => "revoked-jti:" + tokenId;
    }
}
