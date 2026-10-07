using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class UserRefreshTokenConfiguration : IEntityTypeConfiguration<UserRefreshToken>
    {
        public void Configure(EntityTypeBuilder<UserRefreshToken> builder)
        {
            builder.ToTable("UserRefreshTokens");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
            builder.Property(x => x.RefreshToken).HasMaxLength(500).IsRequired();
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.User)
                   .WithMany()
                   .HasForeignKey(x => x.UserId)
                   .HasConstraintName("FK_UserRefreshTokens_Users")
                   .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(x => x.RefreshToken)
                   .HasDatabaseName("IX_UserRefreshTokens_RefreshToken")
                   .IsUnique();
            builder.HasIndex(x => new { x.UserId, x.ExpiryDate })
                   .HasDatabaseName("IX_UserRefreshTokens_UserId_Active")
                   .HasFilter("[RevokedAt] IS NULL");
        }
    }
}
