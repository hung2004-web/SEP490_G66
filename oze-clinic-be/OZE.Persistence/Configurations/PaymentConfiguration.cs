using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
    {
        public void Configure(EntityTypeBuilder<Payment> builder)
        {
            builder.ToTable("Payments", t =>
            {
                t.HasCheckConstraint("CK_Payments_Amount", "[Amount] > 0");
                t.HasCheckConstraint("CK_Payments_PaymentMethod", "[PaymentMethod] IN ('CASH', 'BANK_TRANSFER', 'QR_TRANSFER')");
                t.HasCheckConstraint("CK_Payments_Status", "[PaymentStatus] IN ('PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED')");
                t.HasCheckConstraint("CK_Payments_Purpose", "[Purpose] IN ('Deposit', 'Regular', 'Installment')");
                t.HasCheckConstraint(
                    "CK_Payments_InstallmentPeriod",
                    "[Purpose] <> 'Installment' OR [InstallmentPeriodId] IS NOT NULL");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Amount).HasPrecision(18, 2);
            builder.Property(x => x.PaymentMethod).HasMaxLength(20).IsRequired();
            builder.Property(x => x.TransactionReference).HasMaxLength(100);
            builder.Property(x => x.PaymentStatus).HasMaxLength(20).HasDefaultValue("PENDING");
            builder.Property(x => x.Purpose).HasMaxLength(20).HasDefaultValue("Regular").IsRequired();
            builder.Property(x => x.Notes).HasMaxLength(500);
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.Invoice)
                   .WithMany(x => x.Payments)
                   .HasForeignKey(x => x.InvoiceId)
                   .HasConstraintName("FK_Payments_Invoices")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne<ApplicationUser>()
                   .WithMany()
                   .HasForeignKey(x => x.ConfirmedByUserId)
                   .HasConstraintName("FK_Payments_ConfirmedBy")
                   .OnDelete(DeleteBehavior.NoAction);
            // Optional InstallmentPeriodId — independent of InstallmentPeriod.PaymentId (both nullable, NoAction)
            builder.HasOne(x => x.InstallmentPeriod)
                   .WithMany()
                   .HasForeignKey(x => x.InstallmentPeriodId)
                   .HasConstraintName("FK_Payments_InstallmentPeriods")
                   .OnDelete(DeleteBehavior.NoAction)
                   .IsRequired(false);

            builder.HasIndex(x => x.InvoiceId).HasDatabaseName("IX_Payments_InvoiceId");
            builder.HasIndex(x => x.InstallmentPeriodId)
                   .HasDatabaseName("IX_Payments_InstallmentPeriodId")
                   .IsUnique()
                   .HasFilter("[InstallmentPeriodId] IS NOT NULL");
            builder.HasIndex(x => x.TransactionReference)
                   .HasDatabaseName("IX_Payments_TransactionReference")
                   .IsUnique()
                   .HasFilter("[TransactionReference] IS NOT NULL");
        }
    }
}
