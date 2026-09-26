using System.Net;
using System.Text.Json;
using OZE.Common.Exceptions;
using OZE.Common.Models.Base;

namespace OZE.ProjectBase.Middlewares
{
    public class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionMiddleware> _logger;
        private readonly IHostEnvironment _env;

        public GlobalExceptionMiddleware(RequestDelegate _next, ILogger<GlobalExceptionMiddleware> logger, IHostEnvironment env)
        {
            this._next = _next;
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unhandled exception occurred: {Message}", ex.Message);
                await HandleExceptionAsync(context, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";

            var statusCode = HttpStatusCode.InternalServerError;
            string message = "An internal server error occurred.";
            List<string>? errors = null;

            if (exception is AppException appException)
            {
                statusCode = appException.StatusCode;
                message = appException.Message;
            }
            else
            {
                if (_env.IsDevelopment())
                {
                    message = exception.Message;
                    errors = new List<string> { exception.StackTrace ?? string.Empty };
                }
            }

            context.Response.StatusCode = (int)statusCode;

            var response = ApiResponse.FailureResult(message, errors);
            var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

            await context.Response.WriteAsync(JsonSerializer.Serialize(response, options));
        }
    }
}
