using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class ServiceConfiguration : IEntityTypeConfiguration<Service>
    {
        public void Configure(EntityTypeBuilder<Service> builder)
        {
            builder.ToTable("Services", t =>
            {
                t.HasCheckConstraint("CK_Services_RequiredRoomType", "[RequiredRoomType] IN ('General', 'Imaging', 'Treatment')");
                t.HasCheckConstraint("CK_Services_ReferencePrice", "[ReferencePrice] >= 0");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.ServiceCode).HasMaxLength(20).IsRequired();
            builder.Property(x => x.ServiceName).HasMaxLength(200).IsRequired();
            builder.Property(x => x.ReferencePrice).HasPrecision(18, 2).HasDefaultValue(0m);
            builder.Property(x => x.RequiredRoomType).HasMaxLength(20);
            builder.Property(x => x.IsActive).HasDefaultValue(true).HasSentinel(true);
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasIndex(x => x.ServiceCode).HasDatabaseName("IX_Services_ServiceCode").IsUnique();
            builder.HasIndex(x => x.IsActive)
                   .HasDatabaseName("IX_Services_IsActive")
                   .IncludeProperties(x => new { x.ServiceName, x.ReferencePrice });
        }
    }
}
