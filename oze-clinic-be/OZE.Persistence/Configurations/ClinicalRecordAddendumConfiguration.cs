using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class ClinicalRecordAddendumConfiguration : IEntityTypeConfiguration<ClinicalRecordAddendum>
    {
        public void Configure(EntityTypeBuilder<ClinicalRecordAddendum> builder)
        {
            builder.ToTable("ClinicalRecordAddenda", t =>
            {
                t.HasCheckConstraint("CK_ClinicalRecordAddenda_Type", "[AddendumType] IN ('Correction', 'Addition', 'Clarification')");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.AddendumType).HasMaxLength(20).IsRequired();
            builder.Property(x => x.Content).IsRequired();
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.Examination)
                   .WithMany(x => x.Addenda)
                   .HasForeignKey(x => x.ExaminationId)
                   .HasConstraintName("FK_ClinicalRecordAddenda_Examinations")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(x => x.CreatedByDoctor)
                   .WithMany()
                   .HasForeignKey(x => x.CreatedByDoctorId)
                   .HasConstraintName("FK_ClinicalRecordAddenda_Doctors")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => x.ExaminationId).HasDatabaseName("IX_ClinicalRecordAddenda_ExaminationId");
        }
    }
}
