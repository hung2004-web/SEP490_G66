using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class DentalChartEntryConfiguration : IEntityTypeConfiguration<DentalChartEntry>
    {
        public void Configure(EntityTypeBuilder<DentalChartEntry> builder)
        {
            builder.ToTable("DentalChartEntries");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.ToothNumber).HasMaxLength(5).IsRequired();
            builder.Property(x => x.Surface).HasMaxLength(10);
            builder.Property(x => x.Condition).HasMaxLength(100).IsRequired();
            builder.Property(x => x.Severity).HasMaxLength(20);
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.Examination)
                   .WithMany(x => x.DentalChartEntries)
                   .HasForeignKey(x => x.ExaminationId)
                   .HasConstraintName("FK_DentalChartEntries_Examinations")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(x => x.Patient)
                   .WithMany()
                   .HasForeignKey(x => x.PatientId)
                   .HasConstraintName("FK_DentalChartEntries_Patients")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => new { x.PatientId, x.ToothNumber, x.CreatedAt })
                   .HasDatabaseName("IX_DentalChartEntries_PatientId_Tooth")
                   .IsDescending(false, false, true);
            builder.HasIndex(x => x.ExaminationId).HasDatabaseName("IX_DentalChartEntries_ExaminationId");
        }
    }
}
