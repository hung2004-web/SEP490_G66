using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OZE.Common.Constants;
using OZE.Domain.Entities;

namespace OZE.Persistence.Seed
{
    public static class DatabaseSeeder
    {
        // Local test accounts, one per staff role (Development only). Their password deliberately skips the
        // password policy (no lowercase letter): it is hashed directly instead of going through the validators.
        private const string DevPassword = "12345678";

        private static readonly (string Role, string Email, string Phone, string FullName, string? Specialization, string? LicenseNumber)[] DevAccounts =
        {
            (RoleConstants.DoctorRole, "doctor@oze.com", "+84900000001", "BS. Nguyễn Văn Bác Sĩ", "Răng hàm mặt tổng quát", "CCHN-DEV-0001"),
            (RoleConstants.ReceptionistRole, "receptionist@oze.com", "+84900000002", "Trần Thị Lễ Tân", null, null),
            (RoleConstants.DentalImagingTechnicianRole, "technician@oze.com", "+84900000003", "KTV. Lê Văn Kỹ Thuật", null, null),
        };

        public static async Task SeedAsync(IServiceProvider serviceProvider, bool seedDevAccounts = false)
        {
            var logger = serviceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseSeeder");
            var roleManager = serviceProvider.GetRequiredService<RoleManager<ApplicationRole>>();
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
                    await roleManager.CreateAsync(new ApplicationRole(role) { CreatedAt = DateTimeOffset.UtcNow });
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

            // 3. Development test accounts (same fields as StaffService.CreateStaffAsync, staff sign in with their email)
            if (!seedDevAccounts) return;

            foreach (var account in DevAccounts)
            {
                if (await userManager.FindByEmailAsync(account.Email) != null) continue;

                var now = DateTimeOffset.UtcNow;
                var user = new ApplicationUser
                {
                    Id = Guid.NewGuid().ToString(),
                    UserName = account.Email,
                    Email = account.Email,
                    EmailConfirmed = true,
                    PhoneNumber = account.Phone,
                    PhoneNumberConfirmed = true,
                    CreatedAt = now,
                    StaffProfile = new StaffProfile
                    {
                        FullName = account.FullName,
                        PhoneNumber = account.Phone,
                        Specialization = account.Specialization,
                        LicenseNumber = account.LicenseNumber,
                        IsActive = true,
                        CreatedAt = now
                    }
                };
                user.PasswordHash = userManager.PasswordHasher.HashPassword(user, DevPassword);

                var createResult = await userManager.CreateAsync(user);
                if (createResult.Succeeded)
                {
                    await userManager.AddToRoleAsync(user, account.Role);
                    logger.LogInformation("Development {Role} user '{Email}' created successfully.", account.Role, account.Email);
                }
                else
                {
                    var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                    logger.LogError("Failed to create development {Role} user '{Email}': {Errors}", account.Role, account.Email, errors);
                }
            }
        }
    }
}
