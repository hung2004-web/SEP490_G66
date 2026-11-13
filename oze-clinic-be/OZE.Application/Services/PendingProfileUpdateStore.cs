using Microsoft.Extensions.Caching.Distributed;
using OZE.Application.Interfaces;
using OZE.Application.Services.Caching;
using OZE.Common.Models;

namespace OZE.Application.Services
{
    // Profile changes waiting for the OTP sent to the new phone number, in the shared cache (Redis or memory)
    public class PendingProfileUpdateStore : IPendingProfileUpdateStore
    {
        private const string KeyPrefix = "pending-profile-update:";
        private readonly IDistributedCache _cache;

        public PendingProfileUpdateStore(IDistributedCache cache)
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

            _cache.SetJson(KeyPrefix + update.SessionId, update, timeToLive);
        }

        public PendingProfileUpdate? Get(string sessionId) => _cache.GetJson<PendingProfileUpdate>(KeyPrefix + sessionId);

        public void Remove(string sessionId) => _cache.Remove(KeyPrefix + sessionId);
    }
}
