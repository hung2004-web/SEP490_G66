using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class TreatmentPlanStageConfiguration : IEntityTypeConfiguration<TreatmentPlanStage>
    {
        public void Configure(EntityTypeBuilder<TreatmentPlanStage> builder)
        {
            builder.ToTable("TreatmentPlanStages", t =>
            {
                t.HasCheckConstraint("CK_TreatmentPlanStages_Status", "[StageStatus] IN ('Planned', 'Scheduled', 'InProgress', 'Completed', 'Cancelled')");
                t.HasCheckConstraint("CK_TreatmentPlanStages_EstimatedCost", "[EstimatedCost] >= 0");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.StageName).HasMaxLength(200);
            builder.Property(x => x.EstimatedCost).HasPrecision(18, 2).HasDefaultValue(0m);
            builder.Property(x => x.ActualCost).HasPrecision(18, 2);
            builder.Property(x => x.StageStatus).HasMaxLength(20).HasDefaultValue("Planned");
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.TreatmentPlan)
                   .WithMany(x => x.Stages)
                   .HasForeignKey(x => x.TreatmentPlanId)
                   .HasConstraintName("FK_TreatmentPlanStages_Plans")
                   .OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(x => x.Service)
                   .WithMany()
                   .HasForeignKey(x => x.ServiceId)
                   .HasConstraintName("FK_TreatmentPlanStages_Services")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(x => x.PerformedByDoctor)
                   .WithMany()
                   .HasForeignKey(x => x.PerformedByDoctorId)
                   .HasConstraintName("FK_TreatmentPlanStages_Doctors")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => new { x.TreatmentPlanId, x.StageNumber })
                   .HasDatabaseName("IX_TreatmentPlanStages_PlanId");
            builder.HasIndex(x => x.ScheduledDate)
                   .HasDatabaseName("IX_TreatmentPlanStages_ScheduledDate")
                   .HasFilter("[StageStatus] IN ('Planned', 'Scheduled')");
        }
    }
}
