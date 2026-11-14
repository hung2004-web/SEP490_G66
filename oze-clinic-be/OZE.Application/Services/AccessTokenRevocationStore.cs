using Microsoft.Extensions.Caching.Distributed;
using OZE.Application.Interfaces;
using OZE.Application.Services.Caching;

namespace OZE.Application.Services
{
    // Signed-out tokens, kept only until the token would have expired anyway.
    // In Redis they survive a restart, so a token signed out before the restart stays refused.
    public class AccessTokenRevocationStore : IAccessTokenRevocationStore
    {
        private readonly IDistributedCache _cache;

        public AccessTokenRevocationStore(IDistributedCache cache)
        {
            _cache = cache;
        }

        public void Revoke(string tokenId, DateTimeOffset expiresAt)
        {
            if (expiresAt > DateTimeOffset.UtcNow)
            {
                _cache.SetJson(Key(tokenId), true, expiresAt);
            }
        }

        public bool IsRevoked(string tokenId) => _cache.Get(Key(tokenId)) != null;

        private static string Key(string tokenId) => "revoked-jti:" + tokenId;
    }
}
