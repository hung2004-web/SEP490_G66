using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class TreatmentPlanConfiguration : IEntityTypeConfiguration<TreatmentPlan>
    {
        public void Configure(EntityTypeBuilder<TreatmentPlan> builder)
        {
            builder.ToTable("TreatmentPlans", t =>
            {
                t.HasCheckConstraint("CK_TreatmentPlans_Status", "[Status] IN ('Draft', 'Proposed', 'Approved', 'InProgress', 'Completed', 'Cancelled', 'Superseded')");
                t.HasCheckConstraint("CK_TreatmentPlans_EstimatedTotalCost", "[EstimatedTotalCost] >= 0");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.PlanVersion).HasDefaultValue(1);
            builder.Property(x => x.PlanName).HasMaxLength(200);
            builder.Property(x => x.TotalStages).HasDefaultValue(0);
            builder.Property(x => x.EstimatedTotalCost).HasPrecision(18, 2).HasDefaultValue(0m);
            builder.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("Draft");
            builder.Property(x => x.RowVersion).IsRowVersion();
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.Examination)
                   .WithMany(x => x.TreatmentPlans)
                   .HasForeignKey(x => x.ExaminationId)
                   .HasConstraintName("FK_TreatmentPlans_Examinations")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(x => x.Patient)
                   .WithMany()
                   .HasForeignKey(x => x.PatientId)
                   .HasConstraintName("FK_TreatmentPlans_Patients")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(x => x.CreatedByDoctor)
                   .WithMany()
                   .HasForeignKey(x => x.CreatedByDoctorId)
                   .HasConstraintName("FK_TreatmentPlans_Doctors")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => x.ExaminationId).HasDatabaseName("IX_TreatmentPlans_ExaminationId");
            builder.HasIndex(x => new { x.PatientId, x.CreatedAt })
                   .HasDatabaseName("IX_TreatmentPlans_PatientId")
                   .IsDescending(false, true);
        }
    }
}
