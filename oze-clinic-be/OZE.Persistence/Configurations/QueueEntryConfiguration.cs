using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class QueueEntryConfiguration : IEntityTypeConfiguration<QueueEntry>
    {
        public void Configure(EntityTypeBuilder<QueueEntry> builder)
        {
            builder.ToTable("QueueEntries", t =>
            {
                t.HasCheckConstraint("CK_QueueEntries_QueueType", "[QueueType] IN ('Examination', 'Imaging', 'Treatment')");
                t.HasCheckConstraint("CK_QueueEntries_Status", "[Status] IN ('WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'CANCELLED')");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.QueueType).HasMaxLength(20).IsRequired();
            builder.Property(x => x.Priority).HasDefaultValue(0);
            builder.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("WAITING");
            builder.Property(x => x.Notes).HasMaxLength(500);
            builder.Property(x => x.RowVersion).IsRowVersion();
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.Appointment)
                   .WithMany(x => x.QueueEntries)
                   .HasForeignKey(x => x.AppointmentId)
                   .HasConstraintName("FK_QueueEntries_Appointments")
                   .OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(x => x.Room)
                   .WithMany()
                   .HasForeignKey(x => x.RoomId)
                   .HasConstraintName("FK_QueueEntries_Rooms")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(x => x.AssignedStaff)
                   .WithMany()
                   .HasForeignKey(x => x.AssignedStaffId)
                   .HasConstraintName("FK_QueueEntries_AssignedStaff")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => new { x.RoomId, x.Status, x.QueueNumber })
                   .HasDatabaseName("IX_QueueEntries_RoomId_Status");
            builder.HasIndex(x => x.AppointmentId).HasDatabaseName("IX_QueueEntries_AppointmentId");
        }
    }
}
