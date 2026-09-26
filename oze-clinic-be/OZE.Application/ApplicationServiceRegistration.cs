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

            // Register Services
            services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<IUserService, UserService>();
            services.AddScoped<IEmailSender, EmailSender>();

            return services;
        }
    }
}
