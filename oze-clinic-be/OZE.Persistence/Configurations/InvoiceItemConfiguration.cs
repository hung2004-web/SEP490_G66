using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class InvoiceItemConfiguration : IEntityTypeConfiguration<InvoiceItem>
    {
        public void Configure(EntityTypeBuilder<InvoiceItem> builder)
        {
            builder.ToTable("InvoiceItems", t =>
            {
                t.HasCheckConstraint("CK_InvoiceItems_UnitPrice", "[UnitPrice] >= 0");
                t.HasCheckConstraint("CK_InvoiceItems_Quantity", "[Quantity] > 0");
                t.HasCheckConstraint("CK_InvoiceItems_Amount", "[Amount] >= 0");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.ServiceName).HasMaxLength(200).IsRequired();
            builder.Property(x => x.Description).HasMaxLength(500);
            builder.Property(x => x.UnitPrice).HasPrecision(18, 2);
            builder.Property(x => x.Quantity).HasDefaultValue(1);
            builder.Property(x => x.Amount).HasPrecision(18, 2);
            builder.Property(x => x.SortOrder).HasDefaultValue(0);

            builder.HasOne(x => x.Invoice)
                   .WithMany(x => x.Items)
                   .HasForeignKey(x => x.InvoiceId)
                   .HasConstraintName("FK_InvoiceItems_Invoices")
                   .OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(x => x.Service)
                   .WithMany()
                   .HasForeignKey(x => x.ServiceId)
                   .HasConstraintName("FK_InvoiceItems_Services")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(x => x.TreatmentPlanStage)
                   .WithMany()
                   .HasForeignKey(x => x.TreatmentPlanStageId)
                   .HasConstraintName("FK_InvoiceItems_Stages")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => new { x.InvoiceId, x.SortOrder })
                   .HasDatabaseName("IX_InvoiceItems_InvoiceId");
        }
    }
}
