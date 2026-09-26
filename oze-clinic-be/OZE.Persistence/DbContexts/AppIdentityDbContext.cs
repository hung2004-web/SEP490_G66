using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using OZE.Domain.Entities;

namespace OZE.Persistence.DbContexts
{
    public class AppIdentityDbContext : IdentityDbContext<ApplicationUser>
    {
        public AppIdentityDbContext(DbContextOptions<AppIdentityDbContext> options) : base(options)
        {
        }

        public DbSet<UserRefreshToken> UserRefreshTokens => Set<UserRefreshToken>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<ApplicationUser>().ToTable("Users");

            builder.Entity<UserRefreshToken>(entity =>
            {
                entity.ToTable("UserRefreshTokens");
                entity.HasKey(x => x.Id);
                entity.HasIndex(x => x.RefreshToken).IsUnique();

                entity.HasOne(x => x.User)
                      .WithMany()
                      .HasForeignKey(x => x.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
