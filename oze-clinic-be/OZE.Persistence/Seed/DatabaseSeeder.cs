using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OZE.Common.Constants;
using OZE.Domain.Entities;

namespace OZE.Persistence.Seed
{
    public static class DatabaseSeeder
    {
        public static async Task SeedAsync(IServiceProvider serviceProvider)
        {
            var logger = serviceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseSeeder");
            var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();

            // 1. Seed Roles
            string[] roles = { RoleConstants.AdminRole, RoleConstants.UserRole };
            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole(role));
                    logger.LogInformation("Role '{Role}' created successfully.", role);
                }
            }

            // 2. Seed Default Admin User
            var adminEmail = "admin@oze.com";
            var existingAdmin = await userManager.FindByEmailAsync(adminEmail);
            if (existingAdmin == null)
            {
                var adminUser = new ApplicationUser
                {
                    UserName = adminEmail,
                    Email = adminEmail,
                    FullName = "System Administrator",
                    EmailConfirmed = true,
                    CreateDate = DateTime.UtcNow
                };

                var createResult = await userManager.CreateAsync(adminUser, "Admin@123456");
                if (createResult.Succeeded)
                {
                    await userManager.AddToRoleAsync(adminUser, RoleConstants.AdminRole);
                    await userManager.AddToRoleAsync(adminUser, RoleConstants.UserRole);
                    logger.LogInformation("Default Admin user '{AdminEmail}' created successfully.", adminEmail);
                }
                else
                {
                    var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                    logger.LogError("Failed to create default Admin user: {Errors}", errors);
                }
            }
        }
    }
}
