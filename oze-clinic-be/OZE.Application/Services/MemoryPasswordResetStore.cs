using Microsoft.Extensions.Caching.Memory;
using OZE.Application.Interfaces;
using OZE.Common.Models;

namespace OZE.Application.Services
{
    public class MemoryPasswordResetStore : IPasswordResetStore
    {
        private const string KeyPrefix = "password-reset:";
        private readonly IMemoryCache _cache;

        public MemoryPasswordResetStore(IMemoryCache cache)
        {
            _cache = cache;
        }

        public void Save(PasswordResetSession session, TimeSpan timeToLive)
        {
            if (timeToLive <= TimeSpan.Zero)
            {
                Remove(session.SessionId);
                return;
            }

            _cache.Set(KeyPrefix + session.SessionId, session, timeToLive);
        }

        public PasswordResetSession? Get(string sessionId)
        {
            return _cache.TryGetValue(KeyPrefix + sessionId, out PasswordResetSession? session)
                ? session
                : null;
        }

        public void Remove(string sessionId)
        {
            _cache.Remove(KeyPrefix + sessionId);
        }
    }
}
