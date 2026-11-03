using Microsoft.Extensions.Caching.Memory;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Exceptions;

namespace OZE.Application.Services
{
    // In memory, like the OTP sessions themselves: counts are per server and start again after a restart
    public class OtpSendLimiter : IOtpSendLimiter
    {
        private static readonly object Gate = new();
        private readonly IMemoryCache _cache;

        public OtpSendLimiter(IMemoryCache cache)
        {
            _cache = cache;
        }

        public void EnsureCanSend(string contact)
        {
            var key = "otp-sends:" + contact.Trim().ToLowerInvariant();
            lock (Gate)
            {
                // The window starts with the first code and is not pushed back by the next ones
                var window = _cache.TryGetValue(key, out SendWindow? current) && current != null
                    ? current
                    : new SendWindow(0, DateTimeOffset.UtcNow.AddMinutes(SecurityConstants.OtpSendWindowMinutes));
                if (window.Count >= SecurityConstants.OtpSendsPerWindow)
                {
                    throw new TooManyRequestsException(ErrorConstants.AuthMessage.OtpTooManyRequests);
                }

                _cache.Set(key, window with { Count = window.Count + 1 }, window.EndsAt);
            }
        }

        private sealed record SendWindow(int Count, DateTimeOffset EndsAt);
    }
}
