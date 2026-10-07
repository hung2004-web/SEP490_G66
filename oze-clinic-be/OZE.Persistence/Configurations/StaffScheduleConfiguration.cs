using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class StaffScheduleConfiguration : IEntityTypeConfiguration<StaffSchedule>
    {
        public void Configure(EntityTypeBuilder<StaffSchedule> builder)
        {
            builder.ToTable("StaffSchedules");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Assignment).HasMaxLength(200);
            builder.Property(x => x.AbsenceReason).HasMaxLength(500);
            builder.Property(x => x.Notes).HasMaxLength(500);
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.StaffProfile)
                   .WithMany(x => x.Schedules)
                   .HasForeignKey(x => x.StaffProfileId)
                   .HasConstraintName("FK_StaffSchedules_StaffProfiles")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(x => x.Room)
                   .WithMany()
                   .HasForeignKey(x => x.RoomId)
                   .HasConstraintName("FK_StaffSchedules_Rooms")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => new { x.StaffProfileId, x.ScheduleDate })
                   .HasDatabaseName("IX_StaffSchedules_StaffId_Date");
            builder.HasIndex(x => new { x.ScheduleDate, x.RoomId })
                   .HasDatabaseName("IX_StaffSchedules_Date_Room")
                   .IncludeProperties(x => new { x.StaffProfileId, x.ShiftStart, x.ShiftEnd });
        }
    }
}
