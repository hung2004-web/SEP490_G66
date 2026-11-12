using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class FollowUpContactConfiguration : IEntityTypeConfiguration<FollowUpContact>
    {
        public void Configure(EntityTypeBuilder<FollowUpContact> builder)
        {
            builder.ToTable("FollowUpContacts", t =>
                t.HasCheckConstraint("CK_FollowUpContacts_Outcome", "[Outcome] IN ('Booked', 'CallBack', 'Unreachable', 'Declined')"));
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Outcome).HasMaxLength(20).IsRequired();
            builder.Property(x => x.Note).HasMaxLength(500);
            builder.Property(x => x.CreatedByUserId).IsRequired();
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.Examination)
                   .WithMany(x => x.FollowUpContacts)
                   .HasForeignKey(x => x.ExaminationId)
                   .HasConstraintName("FK_FollowUpContacts_Examinations")
                   .OnDelete(DeleteBehavior.Cascade);
            builder.HasOne<ApplicationUser>()
                   .WithMany()
                   .HasForeignKey(x => x.CreatedByUserId)
                   .HasConstraintName("FK_FollowUpContacts_CreatedBy")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => new { x.ExaminationId, x.CreatedAt }).HasDatabaseName("IX_FollowUpContacts_Exam_Created");
        }
    }

    public class PaymentReminderConfiguration : IEntityTypeConfiguration<PaymentReminder>
    {
        public void Configure(EntityTypeBuilder<PaymentReminder> builder)
        {
            builder.ToTable("PaymentReminders");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Channels).HasMaxLength(30).IsRequired();
            builder.Property(x => x.Message).HasMaxLength(1000).IsRequired();
            builder.Property(x => x.SentByUserId).HasMaxLength(450);

            builder.HasOne(x => x.Invoice)
                   .WithMany()
                   .HasForeignKey(x => x.InvoiceId)
                   .HasConstraintName("FK_PaymentReminders_Invoices")
                   .OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(x => x.InstallmentPeriod)
                   .WithMany()
                   .HasForeignKey(x => x.InstallmentPeriodId)
                   .HasConstraintName("FK_PaymentReminders_InstallmentPeriods")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => new { x.InvoiceId, x.SentAt }).HasDatabaseName("IX_PaymentReminders_Invoice_Sent");
        }
    }

    public class DailyReconciliationConfiguration : IEntityTypeConfiguration<DailyReconciliation>
    {
        public void Configure(EntityTypeBuilder<DailyReconciliation> builder)
        {
            builder.ToTable("DailyReconciliations");
            builder.HasKey(x => x.Id);

            foreach (var money in new[] { "CashCollected", "CashExpected", "CashCounted", "CashDifference", "TransferConfirmed", "PendingTransferAmount", "RefundTotal" })
            {
                builder.Property<decimal>(money).HasPrecision(18, 2);
            }

            builder.Property(x => x.Notes).HasMaxLength(500);
            builder.Property(x => x.ConfirmedByUserId).IsRequired();

            builder.HasOne<ApplicationUser>()
                   .WithMany()
                   .HasForeignKey(x => x.ConfirmedByUserId)
                   .HasConstraintName("FK_DailyReconciliations_ConfirmedBy")
                   .OnDelete(DeleteBehavior.NoAction);

            // One reconciliation per clinic day
            builder.HasIndex(x => x.ClinicDate).IsUnique().HasDatabaseName("UX_DailyReconciliations_ClinicDate");
        }
    }
}
