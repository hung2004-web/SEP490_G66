using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class RefundAdjustmentRequestConfiguration : IEntityTypeConfiguration<RefundAdjustmentRequest>
    {
        public void Configure(EntityTypeBuilder<RefundAdjustmentRequest> builder)
        {
            builder.ToTable("RefundAdjustmentRequests", t =>
            {
                t.HasCheckConstraint("CK_RefundAdjustments_Type", "[RequestType] IN ('Refund', 'Adjustment')");
                t.HasCheckConstraint("CK_RefundAdjustments_Status", "[Status] IN ('Pending', 'Approved', 'Rejected', 'Processed')");
                t.HasCheckConstraint("CK_RefundAdjustments_Amount", "[Amount] > 0");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.RequestType).HasMaxLength(20).IsRequired();
            builder.Property(x => x.Amount).HasPrecision(18, 2);
            builder.Property(x => x.Reason).IsRequired();
            builder.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("Pending");
            builder.Property(x => x.RejectionReason).HasMaxLength(500);
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.Invoice)
                   .WithMany(x => x.RefundAdjustmentRequests)
                   .HasForeignKey(x => x.InvoiceId)
                   .HasConstraintName("FK_RefundAdjustments_Invoices")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(x => x.Payment)
                   .WithMany()
                   .HasForeignKey(x => x.PaymentId)
                   .HasConstraintName("FK_RefundAdjustments_Payments")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne<ApplicationUser>()
                   .WithMany()
                   .HasForeignKey(x => x.RequestedByUserId)
                   .HasConstraintName("FK_RefundAdjustments_RequestedBy")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne<ApplicationUser>()
                   .WithMany()
                   .HasForeignKey(x => x.ApprovedByUserId)
                   .HasConstraintName("FK_RefundAdjustments_ApprovedBy")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => x.InvoiceId).HasDatabaseName("IX_RefundAdjustments_InvoiceId");
            builder.HasIndex(x => x.Status)
                   .HasDatabaseName("IX_RefundAdjustments_Status")
                   .HasFilter("[Status] = 'Pending'");
        }
    }
}
