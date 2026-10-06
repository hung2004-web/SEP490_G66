using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class PrescriptionConfiguration : IEntityTypeConfiguration<Prescription>
    {
        public void Configure(EntityTypeBuilder<Prescription> builder)
        {
            builder.ToTable("Prescriptions", t =>
            {
                t.HasCheckConstraint("CK_Prescriptions_Status", "[Status] IN ('Draft', 'Finalized')");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("Draft");
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.Examination)
                   .WithMany(x => x.Prescriptions)
                   .HasForeignKey(x => x.ExaminationId)
                   .HasConstraintName("FK_Prescriptions_Examinations")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(x => x.Patient)
                   .WithMany()
                   .HasForeignKey(x => x.PatientId)
                   .HasConstraintName("FK_Prescriptions_Patients")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(x => x.PrescribedByDoctor)
                   .WithMany()
                   .HasForeignKey(x => x.PrescribedByDoctorId)
                   .HasConstraintName("FK_Prescriptions_Doctors")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => x.ExaminationId).HasDatabaseName("IX_Prescriptions_ExaminationId");
            builder.HasIndex(x => new { x.PatientId, x.CreatedAt })
                   .HasDatabaseName("IX_Prescriptions_PatientId")
                   .IsDescending(false, true);
        }
    }
}
