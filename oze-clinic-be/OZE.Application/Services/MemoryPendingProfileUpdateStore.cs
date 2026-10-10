using Microsoft.Extensions.Caching.Memory;
using OZE.Application.Interfaces;
using OZE.Common.Models;

namespace OZE.Application.Services
{
    public class MemoryPendingProfileUpdateStore : IPendingProfileUpdateStore
    {
        private const string KeyPrefix = "pending-profile-update:";
        private readonly IMemoryCache _cache;

        public MemoryPendingProfileUpdateStore(IMemoryCache cache)
        {
            _cache = cache;
        }

        public void Save(PendingProfileUpdate update, TimeSpan timeToLive)
        {
            if (timeToLive <= TimeSpan.Zero)
            {
                Remove(update.SessionId);
                return;
            }

            _cache.Set(KeyPrefix + update.SessionId, update, timeToLive);
        }

        public PendingProfileUpdate? Get(string sessionId)
        {
            return _cache.TryGetValue(KeyPrefix + sessionId, out PendingProfileUpdate? update)
                ? update
                : null;
        }

        public void Remove(string sessionId)
        {
            _cache.Remove(KeyPrefix + sessionId);
        }
    }
}
