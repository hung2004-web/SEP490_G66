using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class InstallmentPeriodConfiguration : IEntityTypeConfiguration<InstallmentPeriod>
    {
        public void Configure(EntityTypeBuilder<InstallmentPeriod> builder)
        {
            builder.ToTable("InstallmentPeriods", t =>
            {
                t.HasCheckConstraint("CK_InstallmentPeriods_Status", "[Status] IN ('Pending', 'Paid', 'Overdue')");
                t.HasCheckConstraint("CK_InstallmentPeriods_Amount", "[Amount] > 0");
                t.HasCheckConstraint("CK_InstallmentPeriods_Sequence", "[Sequence] > 0");
                t.HasCheckConstraint(
                    "CK_InstallmentPeriods_Paid",
                    "[Status] <> 'Paid' OR ([PaymentId] IS NOT NULL AND [PaidAt] IS NOT NULL)");
                t.HasCheckConstraint(
                    "CK_InstallmentPeriods_Unpaid",
                    "[Status] = 'Paid' OR [PaymentId] IS NULL");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Amount).HasPrecision(18, 2);
            builder.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("Pending");
            builder.Property(x => x.DueDate).IsRequired();
            builder.Property(x => x.Sequence).IsRequired();

            builder.HasOne(x => x.InstallmentPlan)
                   .WithMany(x => x.Periods)
                   .HasForeignKey(x => x.InstallmentPlanId)
                   .HasConstraintName("FK_InstallmentPeriods_Plans")
                   .OnDelete(DeleteBehavior.NoAction);
            // Optional PaymentId — independent of Payment.InstallmentPeriodId (both nullable, NoAction)
            builder.HasOne(x => x.Payment)
                   .WithMany()
                   .HasForeignKey(x => x.PaymentId)
                   .HasConstraintName("FK_InstallmentPeriods_Payments")
                   .OnDelete(DeleteBehavior.NoAction)
                   .IsRequired(false);

            builder.HasIndex(x => new { x.InstallmentPlanId, x.Sequence })
                   .HasDatabaseName("IX_InstallmentPeriods_PlanId_Sequence")
                   .IsUnique();
            builder.HasIndex(x => new { x.DueDate, x.Status })
                   .HasDatabaseName("IX_InstallmentPeriods_DueDate_Status");
            builder.HasIndex(x => x.PaymentId)
                   .HasDatabaseName("IX_InstallmentPeriods_PaymentId")
                   .IsUnique()
                   .HasFilter("[PaymentId] IS NOT NULL");
        }
    }
}
