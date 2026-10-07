using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
    {
        public void Configure(EntityTypeBuilder<AuditLog> builder)
        {
            builder.ToTable("AuditLogs");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.UserId).HasMaxLength(450);
            builder.Property(x => x.Action).HasMaxLength(50).IsRequired();
            builder.Property(x => x.EntityType).HasMaxLength(100);
            builder.Property(x => x.EntityId).HasMaxLength(50);
            builder.Property(x => x.IpAddress).HasMaxLength(45);
            builder.Property(x => x.UserAgent).HasMaxLength(500);
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasIndex(x => new { x.EntityType, x.EntityId, x.CreatedAt })
                   .HasDatabaseName("IX_AuditLogs_EntityType_EntityId")
                   .IsDescending(false, false, true);
            builder.HasIndex(x => new { x.UserId, x.CreatedAt })
                   .HasDatabaseName("IX_AuditLogs_UserId_CreatedAt")
                   .IsDescending(false, true)
                   .HasFilter("[UserId] IS NOT NULL");
            builder.HasIndex(x => x.CreatedAt)
                   .HasDatabaseName("IX_AuditLogs_CreatedAt")
                   .IsDescending();
        }
    }
}
