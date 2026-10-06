using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class AppointmentConfiguration : IEntityTypeConfiguration<Appointment>
    {
        public void Configure(EntityTypeBuilder<Appointment> builder)
        {
            builder.ToTable("Appointments", t =>
            {
                t.HasCheckConstraint("CK_Appointments_Type", "[AppointmentType] IN ('BOOKED', 'WALK_IN')");
                t.HasCheckConstraint("CK_Appointments_Status", "[Status] IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW')");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.AppointmentType).HasMaxLength(10).IsRequired();
            builder.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("PENDING");
            builder.Property(x => x.CancellationReason).HasMaxLength(500);
            builder.Property(x => x.RowVersion).IsRowVersion();
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.Patient)
                   .WithMany(x => x.Appointments)
                   .HasForeignKey(x => x.PatientId)
                   .HasConstraintName("FK_Appointments_Patients")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(x => x.Doctor)
                   .WithMany()
                   .HasForeignKey(x => x.DoctorId)
                   .HasConstraintName("FK_Appointments_Doctors")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne<ApplicationUser>()
                   .WithMany()
                   .HasForeignKey(x => x.CancelledByUserId)
                   .HasConstraintName("FK_Appointments_CancelledBy")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne<ApplicationUser>()
                   .WithMany()
                   .HasForeignKey(x => x.CreatedByUserId)
                   .HasConstraintName("FK_Appointments_CreatedBy")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => new { x.PatientId, x.AppointmentDate })
                   .HasDatabaseName("IX_Appointments_PatientId_Date")
                   .IncludeProperties(x => new { x.Status, x.AppointmentType });
            builder.HasIndex(x => new { x.DoctorId, x.AppointmentDate })
                   .HasDatabaseName("IX_Appointments_DoctorId_Date")
                   // Filtered indexes do not support NOT IN.
                   .HasFilter("[Status] <> 'CANCELLED' AND [Status] <> 'NO_SHOW'");
            builder.HasIndex(x => new { x.Status, x.AppointmentDate })
                   .HasDatabaseName("IX_Appointments_Status_Date")
                   .HasFilter("[Status] IN ('PENDING', 'CONFIRMED')");
        }
    }
}
