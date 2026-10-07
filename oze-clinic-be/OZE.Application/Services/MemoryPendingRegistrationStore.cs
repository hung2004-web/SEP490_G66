using Microsoft.Extensions.Caching.Memory;
using OZE.Application.Interfaces;
using OZE.Common.Models;

namespace OZE.Application.Services
{
    public class MemoryPendingRegistrationStore : IPendingRegistrationStore
    {
        private const string KeyPrefix = "pending-registration:";
        private readonly IMemoryCache _cache;

        public MemoryPendingRegistrationStore(IMemoryCache cache)
        {
            _cache = cache;
        }

        public void Save(PendingRegistration registration, TimeSpan timeToLive)
        {
            if (timeToLive <= TimeSpan.Zero)
            {
                Remove(registration.SessionId);
                return;
            }

            _cache.Set(KeyPrefix + registration.SessionId, registration, timeToLive);
        }

        public PendingRegistration? Get(string sessionId)
        {
            return _cache.TryGetValue(KeyPrefix + sessionId, out PendingRegistration? registration)
                ? registration
                : null;
        }

        public void Remove(string sessionId)
        {
            _cache.Remove(KeyPrefix + sessionId);
        }
    }
}
