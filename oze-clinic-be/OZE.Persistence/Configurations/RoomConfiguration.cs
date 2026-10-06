using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class RoomConfiguration : IEntityTypeConfiguration<Room>
    {
        public void Configure(EntityTypeBuilder<Room> builder)
        {
            builder.ToTable("Rooms", t =>
            {
                t.HasCheckConstraint("CK_Rooms_RoomType", "[RoomType] IN ('General', 'Imaging', 'Treatment')");
                t.HasCheckConstraint("CK_Rooms_Status", "[Status] IN ('Active', 'Maintenance', 'Inactive')");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.RoomName).HasMaxLength(100).IsRequired();
            builder.Property(x => x.RoomType).HasMaxLength(20).IsRequired();
            builder.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("Active");
            builder.Property(x => x.Floor).HasMaxLength(20);
            builder.Property(x => x.Description).HasMaxLength(500);
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasIndex(x => x.RoomName).HasDatabaseName("IX_Rooms_RoomName").IsUnique();
        }
    }
}
