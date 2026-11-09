using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class InstallmentPlanConfiguration : IEntityTypeConfiguration<InstallmentPlan>
    {
        public void Configure(EntityTypeBuilder<InstallmentPlan> builder)
        {
            builder.ToTable("InstallmentPlans");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Notes).HasMaxLength(500);
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.Invoice)
                   .WithMany(x => x.InstallmentPlans)
                   .HasForeignKey(x => x.InvoiceId)
                   .HasConstraintName("FK_InstallmentPlans_Invoices")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne<ApplicationUser>()
                   .WithMany()
                   .HasForeignKey(x => x.CreatedByUserId)
                   .HasConstraintName("FK_InstallmentPlans_CreatedBy")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => x.InvoiceId)
                   .HasDatabaseName("IX_InstallmentPlans_InvoiceId")
                   .IsUnique();
        }
    }
}
