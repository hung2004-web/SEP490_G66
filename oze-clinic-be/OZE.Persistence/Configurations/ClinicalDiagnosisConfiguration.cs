using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class ClinicalDiagnosisConfiguration : IEntityTypeConfiguration<ClinicalDiagnosis>
    {
        public void Configure(EntityTypeBuilder<ClinicalDiagnosis> builder)
        {
            builder.ToTable("ClinicalDiagnoses");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.DiagnosisCode).HasMaxLength(20);
            builder.Property(x => x.DiagnosisName).HasMaxLength(300).IsRequired();
            builder.Property(x => x.IsPrimary).HasDefaultValue(false);
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.Examination)
                   .WithMany(x => x.Diagnoses)
                   .HasForeignKey(x => x.ExaminationId)
                   .HasConstraintName("FK_ClinicalDiagnoses_Examinations")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(x => x.DiagnosedByDoctor)
                   .WithMany()
                   .HasForeignKey(x => x.DiagnosedByDoctorId)
                   .HasConstraintName("FK_ClinicalDiagnoses_Doctors")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => x.ExaminationId).HasDatabaseName("IX_ClinicalDiagnoses_ExaminationId");
        }
    }
}
