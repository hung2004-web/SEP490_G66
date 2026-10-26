using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class ServiceCategoryConfiguration : IEntityTypeConfiguration<ServiceCategory>
    {
        public void Configure(EntityTypeBuilder<ServiceCategory> builder)
        {
            builder.ToTable("ServiceCategories");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.CategoryCode).HasMaxLength(20).IsRequired();
            builder.Property(x => x.CategoryName).HasMaxLength(100).IsRequired();
            builder.Property(x => x.Description).HasMaxLength(500);
            builder.Property(x => x.DisplayOrder).HasDefaultValue(0);
            builder.Property(x => x.AllowMultipleSelection).HasDefaultValue(false);
            builder.Property(x => x.IsActive).HasDefaultValue(true).HasSentinel(true);
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasIndex(x => x.CategoryCode).HasDatabaseName("IX_ServiceCategories_CategoryCode").IsUnique();
        }
    }
}
