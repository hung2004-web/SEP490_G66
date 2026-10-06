using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class StaffProfileConfiguration : IEntityTypeConfiguration<StaffProfile>
    {
        public void Configure(EntityTypeBuilder<StaffProfile> builder)
        {
            builder.ToTable("StaffProfiles", t =>
            {
                t.HasCheckConstraint("CK_StaffProfiles_Gender", "[Gender] IN ('Male', 'Female', 'Other')");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.FullName).HasMaxLength(200).IsRequired();
            builder.Property(x => x.PhoneNumber).HasMaxLength(20);
            builder.Property(x => x.Gender).HasMaxLength(10);
            builder.Property(x => x.Specialization).HasMaxLength(100);
            builder.Property(x => x.LicenseNumber).HasMaxLength(50);
            builder.Property(x => x.IsActive).HasDefaultValue(true).HasSentinel(true);
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.User)
                   .WithOne(x => x.StaffProfile)
                   .HasForeignKey<StaffProfile>(x => x.UserId)
                   .HasConstraintName("FK_StaffProfiles_Users")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => x.UserId).HasDatabaseName("IX_StaffProfiles_UserId").IsUnique();
            builder.HasIndex(x => x.LicenseNumber)
                   .HasDatabaseName("IX_StaffProfiles_LicenseNumber")
                   .IsUnique()
                   .HasFilter("[LicenseNumber] IS NOT NULL");
            builder.HasIndex(x => x.IsActive)
                   .HasDatabaseName("IX_StaffProfiles_IsActive")
                   .IncludeProperties(x => new { x.FullName, x.Specialization });
        }
    }
}
