using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Models;

namespace OZE.Application
{
    public static class ApplicationServiceRegistration
    {
        public static IServiceCollection AddApplication(this IServiceCollection services, IConfiguration configuration)
        {
            // Configure Options
            services.Configure<JwtSettings>(configuration.GetSection("JwtSettings"));
            services.Configure<AuthMessageSenderOptions>(configuration.GetSection("AuthMessageSenderOptions"));
            services.Configure<AuthSmsSenderOptions>(configuration.GetSection("AuthSmsSenderOptions"));
            services.Configure<RegisterOtpSettings>(configuration.GetSection("RegisterOtpSettings"));

            services.AddMemoryCache();

            // Register Services
            services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<IUserService, UserService>();
            services.AddScoped<IEmailSender, EmailSender>();
            services.AddScoped<ISmsSender, SmsSender>();
            services.AddSingleton<IPendingRegistrationStore, MemoryPendingRegistrationStore>();
            services.AddSingleton<IPendingProfileUpdateStore, MemoryPendingProfileUpdateStore>();

            return services;
        }
    }
}
