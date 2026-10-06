using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
    {
        public void Configure(EntityTypeBuilder<Notification> builder)
        {
            builder.ToTable("Notifications", t =>
            {
                t.HasCheckConstraint("CK_Notifications_Type", "[NotificationType] IN ('InApp', 'Email', 'SMS')");
                t.HasCheckConstraint("CK_Notifications_DeliveryStatus", "[DeliveryStatus] IN ('Pending', 'Sent', 'Delivered', 'Failed')");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Title).HasMaxLength(200).IsRequired();
            builder.Property(x => x.Message).IsRequired();
            builder.Property(x => x.NotificationType).HasMaxLength(20).IsRequired();
            builder.Property(x => x.Channel).HasMaxLength(20).HasDefaultValue("InApp");
            builder.Property(x => x.ReferenceType).HasMaxLength(50);
            builder.Property(x => x.ReferenceId).HasMaxLength(50);
            builder.Property(x => x.IsRead).HasDefaultValue(false);
            builder.Property(x => x.DeliveryStatus).HasMaxLength(20).HasDefaultValue("Pending");
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne<ApplicationUser>()
                   .WithMany()
                   .HasForeignKey(x => x.UserId)
                   .HasConstraintName("FK_Notifications_Users")
                   .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(x => new { x.UserId, x.CreatedAt }, "IX_Notifications_UserId_Unread")
                   .IsDescending(false, true)
                   .HasFilter("[IsRead] = 0");
            builder.HasIndex(x => new { x.UserId, x.CreatedAt }, "IX_Notifications_UserId_CreatedAt")
                   .IsDescending(false, true);
        }
    }
}
