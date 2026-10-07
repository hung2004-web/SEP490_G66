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

            // 1. Seed Roles (normally already inserted by the InitialCreate migration)
            string[] roles =
            {
                RoleConstants.PatientRole,
                RoleConstants.DoctorRole,
                RoleConstants.ReceptionistRole,
                RoleConstants.DentalImagingTechnicianRole,
                RoleConstants.ClinicManagerRole
            };
            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole(role));
                    logger.LogInformation("Role '{Role}' created successfully.", role);
                }
            }

            // 2. Seed Default Clinic Manager account (each user has exactly one role)
            var adminEmail = "admin@oze.com";
            var existingAdmin = await userManager.FindByEmailAsync(adminEmail);
            if (existingAdmin == null)
            {
                var adminUser = new ApplicationUser
                {
                    UserName = adminEmail,
                    Email = adminEmail,
                    EmailConfirmed = true,
                    StaffProfile = new StaffProfile
                    {
                        FullName = "System Administrator"
                    }
                };

                var createResult = await userManager.CreateAsync(adminUser, "Admin@123456");
                if (createResult.Succeeded)
                {
                    await userManager.AddToRoleAsync(adminUser, RoleConstants.ClinicManagerRole);
                    logger.LogInformation("Default Clinic Manager user '{AdminEmail}' created successfully.", adminEmail);
                }
                else
                {
                    var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                    logger.LogError("Failed to create default Clinic Manager user: {Errors}", errors);
                }
            }
        }
    }
}
