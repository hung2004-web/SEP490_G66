using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class ServiceVariantConfiguration : IEntityTypeConfiguration<ServiceVariant>
    {
        public void Configure(EntityTypeBuilder<ServiceVariant> builder)
        {
            builder.ToTable("ServiceVariants", t =>
            {
                t.HasCheckConstraint("CK_ServiceVariants_ReferencePrice", "[ReferencePrice] >= 0");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.VariantCode).HasMaxLength(20).IsRequired();
            builder.Property(x => x.VariantName).HasMaxLength(100).IsRequired();
            builder.Property(x => x.Description).HasMaxLength(500);
            builder.Property(x => x.ReferencePrice).HasPrecision(18, 2).HasDefaultValue(0m);
            builder.Property(x => x.DisplayOrder).HasDefaultValue(0);
            builder.Property(x => x.IsActive).HasDefaultValue(true).HasSentinel(true);
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.Service)
                   .WithMany(x => x.Variants)
                   .HasForeignKey(x => x.ServiceId)
                   .HasConstraintName("FK_ServiceVariants_Services")
                   .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(x => x.VariantCode).HasDatabaseName("IX_ServiceVariants_VariantCode").IsUnique();
            builder.HasIndex(x => x.ServiceId).HasDatabaseName("IX_ServiceVariants_ServiceId");
        }
    }
}
