using Microsoft.Extensions.Caching.Distributed;
using OZE.Application.Interfaces;
using OZE.Application.Services.Caching;
using OZE.Common.Models;

namespace OZE.Application.Services
{
    // Registrations waiting for the OTP, in the shared cache (Redis or memory)
    public class PendingRegistrationStore : IPendingRegistrationStore
    {
        private const string KeyPrefix = "pending-registration:";
        private readonly IDistributedCache _cache;

        public PendingRegistrationStore(IDistributedCache cache)
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

            _cache.SetJson(KeyPrefix + registration.SessionId, registration, timeToLive);
        }

        public PendingRegistration? Get(string sessionId) => _cache.GetJson<PendingRegistration>(KeyPrefix + sessionId);

        public void Remove(string sessionId) => _cache.Remove(KeyPrefix + sessionId);
    }
}
