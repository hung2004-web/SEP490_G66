using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using OZE.Common.Constants;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    /// <summary>
    /// Overrides the default ASP.NET Identity mapping to match the OZE schema
    /// (table/index/constraint names, column sizes, defaults, one-role-per-user rule).
    /// Must be applied after IdentityDbContext.OnModelCreating.
    /// </summary>
    public static class IdentityConfiguration
    {
        public static void Configure(ModelBuilder builder)
        {
            builder.Entity<ApplicationUser>(entity =>
            {
                entity.ToTable("Users");

                entity.Property(x => x.PhoneNumber).HasMaxLength(20);
                entity.Property(x => x.EmailConfirmed).HasDefaultValue(false);
                entity.Property(x => x.PhoneNumberConfirmed).HasDefaultValue(false);
                entity.Property(x => x.TwoFactorEnabled).HasDefaultValue(false);
                entity.Property(x => x.LockoutEnabled).HasDefaultValue(true).HasSentinel(true);
                entity.Property(x => x.AccessFailedCount).HasDefaultValue(0);
                entity.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

                entity.HasIndex(x => x.NormalizedUserName)
                      .HasDatabaseName("IX_Users_NormalizedUserName")
                      .IsUnique()
                      .HasFilter("[NormalizedUserName] IS NOT NULL");
                // BR-004: phone numbers and emails must be unique.
                entity.HasIndex(x => x.NormalizedEmail)
                      .HasDatabaseName("IX_Users_NormalizedEmail")
                      .IsUnique()
                      .HasFilter("[NormalizedEmail] IS NOT NULL");
                entity.HasIndex(x => x.PhoneNumber)
                      .HasDatabaseName("IX_Users_PhoneNumber")
                      .IsUnique()
                      .HasFilter("[PhoneNumber] IS NOT NULL");

                entity.HasMany<IdentityUserClaim<string>>().WithOne()
                      .HasForeignKey(x => x.UserId)
                      .HasConstraintName("FK_AspNetUserClaims_Users")
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasMany<IdentityUserLogin<string>>().WithOne()
                      .HasForeignKey(x => x.UserId)
                      .HasConstraintName("FK_AspNetUserLogins_Users")
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasMany<IdentityUserToken<string>>().WithOne()
                      .HasForeignKey(x => x.UserId)
                      .HasConstraintName("FK_AspNetUserTokens_Users")
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasMany<IdentityUserRole<string>>().WithOne()
                      .HasForeignKey(x => x.UserId)
                      .HasConstraintName("FK_AspNetUserRoles_Users")
                      .OnDelete(DeleteBehavior.Cascade);
            });

            builder.Entity<IdentityRole>(entity =>
            {
                entity.ToTable("AspNetRoles");

                entity.HasIndex(x => x.NormalizedName)
                      .HasDatabaseName("IX_AspNetRoles_NormalizedName")
                      .IsUnique()
                      .HasFilter("[NormalizedName] IS NOT NULL");

                entity.HasMany<IdentityUserRole<string>>().WithOne()
                      .HasForeignKey(x => x.RoleId)
                      .HasConstraintName("FK_AspNetUserRoles_Roles")
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasMany<IdentityRoleClaim<string>>().WithOne()
                      .HasForeignKey(x => x.RoleId)
                      .HasConstraintName("FK_AspNetRoleClaims_Roles")
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasData(
                    Role("8d04dce2-969a-435d-bba4-df3f325983dc", RoleConstants.PatientRole, "f0a1b2c3-0001-4000-8000-000000000001"),
                    Role("a1f4c1b5-7b2e-4c6e-9f3a-2d5e8b7c9a01", RoleConstants.DoctorRole, "f0a1b2c3-0002-4000-8000-000000000002"),
                    Role("b2e5d2c6-8c3f-4d7f-a04b-3e6f9c8dab02", RoleConstants.ReceptionistRole, "f0a1b2c3-0003-4000-8000-000000000003"),
                    Role("c3f6e3d7-9d40-4e80-b15c-4f70ad9ebc03", RoleConstants.DentalImagingTechnicianRole, "f0a1b2c3-0004-4000-8000-000000000004"),
                    Role("d4071408-ae51-4f91-a26d-5081beafcd04", RoleConstants.ClinicManagerRole, "f0a1b2c3-0005-4000-8000-000000000005"));
            });

            builder.Entity<IdentityUserRole<string>>(entity =>
            {
                entity.ToTable("AspNetUserRoles");
                entity.HasIndex(x => x.UserId).HasDatabaseName("IX_AspNetUserRoles_UserId_Unique").IsUnique();
                entity.HasIndex(x => x.RoleId).HasDatabaseName("IX_AspNetUserRoles_RoleId");
            });

            builder.Entity<IdentityUserClaim<string>>(entity =>
            {
                entity.ToTable("AspNetUserClaims");
                entity.HasIndex(x => x.UserId).HasDatabaseName("IX_AspNetUserClaims_UserId");
            });

            builder.Entity<IdentityRoleClaim<string>>(entity =>
            {
                entity.ToTable("AspNetRoleClaims");
                entity.HasIndex(x => x.RoleId).HasDatabaseName("IX_AspNetRoleClaims_RoleId");
            });

            builder.Entity<IdentityUserLogin<string>>(entity =>
            {
                entity.ToTable("AspNetUserLogins");
                entity.Property(x => x.LoginProvider).HasMaxLength(128);
                entity.Property(x => x.ProviderKey).HasMaxLength(128);
                entity.HasIndex(x => x.UserId).HasDatabaseName("IX_AspNetUserLogins_UserId");
            });

            builder.Entity<IdentityUserToken<string>>(entity =>
            {
                entity.ToTable("AspNetUserTokens");
                entity.Property(x => x.LoginProvider).HasMaxLength(128);
                entity.Property(x => x.Name).HasMaxLength(128);
            });
        }

        private static IdentityRole Role(string id, string name, string concurrencyStamp) => new()
        {
            Id = id,
            Name = name,
            NormalizedName = name.ToUpperInvariant(),
            ConcurrencyStamp = concurrencyStamp
        };
    }
}
