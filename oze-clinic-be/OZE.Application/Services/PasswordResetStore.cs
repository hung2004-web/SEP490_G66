using Microsoft.Extensions.Caching.Distributed;
using OZE.Application.Interfaces;
using OZE.Application.Services.Caching;
using OZE.Common.Models;

namespace OZE.Application.Services
{
    // Password reset sessions in the shared cache (Redis or memory), gone when the OTP time runs out
    public class PasswordResetStore : IPasswordResetStore
    {
        private const string KeyPrefix = "password-reset:";
        private readonly IDistributedCache _cache;

        public PasswordResetStore(IDistributedCache cache)
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

            _cache.SetJson(KeyPrefix + session.SessionId, session, timeToLive);
        }

        public PasswordResetSession? Get(string sessionId) => _cache.GetJson<PasswordResetSession>(KeyPrefix + sessionId);

        public void Remove(string sessionId) => _cache.Remove(KeyPrefix + sessionId);
    }
}
