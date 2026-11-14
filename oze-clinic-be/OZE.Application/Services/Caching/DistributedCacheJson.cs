using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;

namespace OZE.Application.Services.Caching
{
    // Short-lived values (OTP sessions, revoked tokens, cached lists) kept as JSON in the shared cache:
    // Redis when ConnectionStrings:Redis is set, the server's memory otherwise (see ApplicationServiceRegistration).
    public static class DistributedCacheJson
    {
        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

        public static T? GetJson<T>(this IDistributedCache cache, string key)
        {
            var bytes = cache.Get(key);
            return bytes == null ? default : JsonSerializer.Deserialize<T>(bytes, Json);
        }

        public static void SetJson<T>(this IDistributedCache cache, string key, T value, DistributedCacheEntryOptions options)
        {
            cache.Set(key, JsonSerializer.SerializeToUtf8Bytes(value, Json), options);
        }

        public static void SetJson<T>(this IDistributedCache cache, string key, T value, TimeSpan timeToLive) =>
            cache.SetJson(key, value, new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = timeToLive });

        public static void SetJson<T>(this IDistributedCache cache, string key, T value, DateTimeOffset expiresAt) =>
            cache.SetJson(key, value, new DistributedCacheEntryOptions { AbsoluteExpiration = expiresAt });

        public static async Task<T?> GetJsonAsync<T>(this IDistributedCache cache, string key, CancellationToken cancellationToken = default)
        {
            var bytes = await cache.GetAsync(key, cancellationToken);
            return bytes == null ? default : JsonSerializer.Deserialize<T>(bytes, Json);
        }

        public static Task SetJsonAsync<T>(
            this IDistributedCache cache,
            string key,
            T value,
            DistributedCacheEntryOptions options,
            CancellationToken cancellationToken = default) =>
            cache.SetAsync(key, JsonSerializer.SerializeToUtf8Bytes(value, Json), options, cancellationToken);
    }
}
