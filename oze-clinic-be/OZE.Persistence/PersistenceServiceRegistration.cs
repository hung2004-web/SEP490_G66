using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using OZE.Application.Interfaces;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;
using OZE.Persistence.Repositories;

namespace OZE.Persistence
{
    public static class PersistenceServiceRegistration
    {
        public static IServiceCollection AddPersistence(this IServiceCollection services, IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection");

            services.AddDbContext<AppIdentityDbContext>(options =>
                options.UseSqlServer(connectionString));

            services.AddIdentity<ApplicationUser, IdentityRole>(options =>
            {
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = false;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequiredLength = 6;
                options.User.RequireUniqueEmail = true;
                options.SignIn.RequireConfirmedEmail = false; // set true if email confirmation is enforced
            })
            .AddEntityFrameworkStores<AppIdentityDbContext>()
            .AddDefaultTokenProviders();

            services.AddScoped<IUserRefreshTokenRepository, UserRefreshTokenRepository>();

            return services;
        }
    }
}
