using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
    {
        public void Configure(EntityTypeBuilder<Invoice> builder)
        {
            builder.ToTable("Invoices", t =>
            {
                t.HasCheckConstraint("CK_Invoices_PaymentStatus", "[PaymentStatus] IN ('UNPAID', 'PENDING_CONFIRMATION', 'PAID', 'PARTIALLY_PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'CANCELLED')");
                t.HasCheckConstraint("CK_Invoices_TotalAmount", "[TotalAmount] >= 0");
                t.HasCheckConstraint("CK_Invoices_DiscountAmount", "[DiscountAmount] >= 0");
                t.HasCheckConstraint("CK_Invoices_FinalAmount", "[FinalAmount] >= 0");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.InvoiceNumber).HasMaxLength(30).IsRequired();
            builder.Property(x => x.TotalAmount).HasPrecision(18, 2).HasDefaultValue(0m);
            builder.Property(x => x.DiscountAmount).HasPrecision(18, 2).HasDefaultValue(0m);
            builder.Property(x => x.FinalAmount).HasPrecision(18, 2).HasDefaultValue(0m);
            builder.Property(x => x.PaidAmount).HasPrecision(18, 2).HasDefaultValue(0m);
            builder.Property(x => x.PaymentStatus).HasMaxLength(25).HasDefaultValue("UNPAID");
            builder.Property(x => x.RowVersion).IsRowVersion();
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.Appointment)
                   .WithMany()
                   .HasForeignKey(x => x.AppointmentId)
                   .HasConstraintName("FK_Invoices_Appointments")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(x => x.Patient)
                   .WithMany()
                   .HasForeignKey(x => x.PatientId)
                   .HasConstraintName("FK_Invoices_Patients")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(x => x.TreatmentPlan)
                   .WithMany()
                   .HasForeignKey(x => x.TreatmentPlanId)
                   .HasConstraintName("FK_Invoices_TreatmentPlans")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne<ApplicationUser>()
                   .WithMany()
                   .HasForeignKey(x => x.CreatedByUserId)
                   .HasConstraintName("FK_Invoices_CreatedBy")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => x.InvoiceNumber).HasDatabaseName("IX_Invoices_InvoiceNumber").IsUnique();
            builder.HasIndex(x => x.PaymentStatus)
                   .HasDatabaseName("IX_Invoices_PaymentStatus")
                   .HasFilter("[PaymentStatus] IN ('UNPAID', 'PENDING_CONFIRMATION', 'PARTIALLY_PAID')");
            builder.HasIndex(x => new { x.PatientId, x.CreatedAt })
                   .HasDatabaseName("IX_Invoices_PatientId")
                   .IsDescending(false, true);
        }
    }
}
