using Microsoft.Extensions.Options;
using OZE.XRaySimulator.Infrastructure.Options;

namespace OZE.XRaySimulator.Api.Auth;

public sealed class ApiKeyMiddleware
{
    private const string ApiKeyHeaderName = "X-Api-Key";
    private readonly RequestDelegate _next;

    public ApiKeyMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IOptions<SimulatorOptions> options)
    {
        var path = context.Request.Path.Value ?? string.Empty;

        // Bypass public/health/swagger endpoints
        if (path.Equals("/health", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        if (!context.Request.Headers.TryGetValue(ApiKeyHeaderName, out var extractedApiKey))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync("{\"error\": \"Missing X-Api-Key header.\"}");
            return;
        }

        var configuredApiKey = options.Value.ApiKey;
        if (!string.Equals(configuredApiKey, extractedApiKey, StringComparison.Ordinal))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync("{\"error\": \"Invalid API Key.\"}");
            return;
        }

        await _next(context);
    }
}
