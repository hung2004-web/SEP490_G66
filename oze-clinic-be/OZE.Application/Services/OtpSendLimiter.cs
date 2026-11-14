using Microsoft.Extensions.Caching.Distributed;
using OZE.Application.Interfaces;
using OZE.Application.Services.Caching;
using OZE.Common.Constants;
using OZE.Common.Exceptions;

namespace OZE.Application.Services
{
    // Codes sent per contact in a window, kept in the shared cache so a restart does not reset the count.
    // The lock guards one server; the app runs as a single instance.
    public class OtpSendLimiter : IOtpSendLimiter
    {
        private static readonly object Gate = new();
        private readonly IDistributedCache _cache;

        public OtpSendLimiter(IDistributedCache cache)
        {
            _cache = cache;
        }

        public void EnsureCanSend(string purpose, string contact)
        {
            var key = "otp-sends:" + purpose + ":" + contact.Trim().ToLowerInvariant();
            lock (Gate)
            {
                // The window starts with the first code and is not pushed back by the next ones
                var now = DateTimeOffset.UtcNow;
                var current = _cache.GetJson<SendWindow>(key);
                var window = current != null && current.EndsAt > now
                    ? current
                    : new SendWindow(0, now.AddMinutes(SecurityConstants.OtpSendWindowMinutes));
                if (window.Count >= SecurityConstants.OtpSendsPerWindow)
                {
                    throw new TooManyRequestsException(ErrorConstants.AuthMessage.OtpTooManyRequests);
                }

                _cache.SetJson(key, window with { Count = window.Count + 1 }, window.EndsAt);
            }
        }

        private sealed record SendWindow(int Count, DateTimeOffset EndsAt);
    }
}
