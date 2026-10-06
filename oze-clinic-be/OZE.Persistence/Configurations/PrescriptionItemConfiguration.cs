using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class PrescriptionItemConfiguration : IEntityTypeConfiguration<PrescriptionItem>
    {
        public void Configure(EntityTypeBuilder<PrescriptionItem> builder)
        {
            builder.ToTable("PrescriptionItems");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.MedicationName).HasMaxLength(300).IsRequired();
            builder.Property(x => x.Dosage).HasMaxLength(100);
            builder.Property(x => x.Frequency).HasMaxLength(200);
            builder.Property(x => x.Duration).HasMaxLength(100);
            builder.Property(x => x.Instructions).HasMaxLength(500);
            builder.Property(x => x.SortOrder).HasDefaultValue(0);

            builder.HasOne(x => x.Prescription)
                   .WithMany(x => x.Items)
                   .HasForeignKey(x => x.PrescriptionId)
                   .HasConstraintName("FK_PrescriptionItems_Prescriptions")
                   .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(x => new { x.PrescriptionId, x.SortOrder })
                   .HasDatabaseName("IX_PrescriptionItems_PrescriptionId");
        }
    }
}
