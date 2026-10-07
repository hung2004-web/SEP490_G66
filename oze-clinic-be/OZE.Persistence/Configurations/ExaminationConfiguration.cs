using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class ExaminationConfiguration : IEntityTypeConfiguration<Examination>
    {
        public void Configure(EntityTypeBuilder<Examination> builder)
        {
            builder.ToTable("Examinations", t =>
            {
                t.HasCheckConstraint("CK_Examinations_Status", "[ExaminationStatus] IN ('InProgress', 'Completed', 'Locked')");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.ExaminationStatus).HasMaxLength(20).HasDefaultValue("InProgress");
            builder.Property(x => x.RowVersion).IsRowVersion();
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.Appointment)
                   .WithOne(x => x.Examination)
                   .HasForeignKey<Examination>(x => x.AppointmentId)
                   .HasConstraintName("FK_Examinations_Appointments")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(x => x.Patient)
                   .WithMany()
                   .HasForeignKey(x => x.PatientId)
                   .HasConstraintName("FK_Examinations_Patients")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(x => x.Doctor)
                   .WithMany()
                   .HasForeignKey(x => x.DoctorId)
                   .HasConstraintName("FK_Examinations_Doctors")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne<ApplicationUser>()
                   .WithMany()
                   .HasForeignKey(x => x.LockedByUserId)
                   .HasConstraintName("FK_Examinations_LockedBy")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => x.AppointmentId).HasDatabaseName("IX_Examinations_AppointmentId").IsUnique();
            builder.HasIndex(x => new { x.PatientId, x.CreatedAt })
                   .HasDatabaseName("IX_Examinations_PatientId_CreatedAt")
                   .IsDescending(false, true);
            builder.HasIndex(x => new { x.DoctorId, x.CreatedAt })
                   .HasDatabaseName("IX_Examinations_DoctorId_CreatedAt")
                   .IsDescending(false, true);
        }
    }
}
