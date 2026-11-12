using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class CashSessionConfiguration : IEntityTypeConfiguration<CashSession>
    {
        public void Configure(EntityTypeBuilder<CashSession> builder)
        {
            builder.ToTable("CashSessions", t =>
            {
                t.HasCheckConstraint("CK_CashSessions_Status", "[Status] IN ('Open', 'Closed')");
                t.HasCheckConstraint("CK_CashSessions_OpeningCash", "[OpeningCash] >= 0");
                t.HasCheckConstraint("CK_CashSessions_CountedCash", "[CountedCash] IS NULL OR [CountedCash] >= 0");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.OpenedByUserId).IsRequired();
            builder.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("Open");
            builder.Property(x => x.OpeningCash).HasPrecision(18, 2);
            builder.Property(x => x.CashCollected).HasPrecision(18, 2);
            builder.Property(x => x.TransferConfirmed).HasPrecision(18, 2);
            builder.Property(x => x.ExpenseTotal).HasPrecision(18, 2);
            builder.Property(x => x.ExpectedCash).HasPrecision(18, 2);
            builder.Property(x => x.CountedCash).HasPrecision(18, 2);
            builder.Property(x => x.Difference).HasPrecision(18, 2);
            builder.Property(x => x.Notes).HasMaxLength(500);
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne<ApplicationUser>()
                   .WithMany()
                   .HasForeignKey(x => x.OpenedByUserId)
                   .HasConstraintName("FK_CashSessions_OpenedBy")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne<ApplicationUser>()
                   .WithMany()
                   .HasForeignKey(x => x.HandoverToUserId)
                   .HasConstraintName("FK_CashSessions_HandoverTo")
                   .OnDelete(DeleteBehavior.NoAction);

            // A receptionist has at most one open drawer at a time
            builder.HasIndex(x => x.OpenedByUserId)
                   .IsUnique()
                   .HasDatabaseName("UX_CashSessions_OneOpenPerUser")
                   .HasFilter("[Status] = 'Open'");
            builder.HasIndex(x => x.OpenedAt).HasDatabaseName("IX_CashSessions_OpenedAt");
        }
    }

    public class CashExpenseConfiguration : IEntityTypeConfiguration<CashExpense>
    {
        public void Configure(EntityTypeBuilder<CashExpense> builder)
        {
            builder.ToTable("CashExpenses", t =>
            {
                t.HasCheckConstraint("CK_CashExpenses_Amount", "[Amount] > 0");
                t.HasCheckConstraint("CK_CashExpenses_Category", "[Category] IN ('Supplies', 'Other')");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Amount).HasPrecision(18, 2);
            builder.Property(x => x.Category).HasMaxLength(20).HasDefaultValue("Other");
            builder.Property(x => x.Description).HasMaxLength(300).IsRequired();
            builder.Property(x => x.CreatedByUserId).IsRequired();
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.CashSession)
                   .WithMany(x => x.Expenses)
                   .HasForeignKey(x => x.CashSessionId)
                   .HasConstraintName("FK_CashExpenses_CashSessions")
                   .OnDelete(DeleteBehavior.Cascade);
            builder.HasOne<ApplicationUser>()
                   .WithMany()
                   .HasForeignKey(x => x.CreatedByUserId)
                   .HasConstraintName("FK_CashExpenses_CreatedBy")
                   .OnDelete(DeleteBehavior.NoAction);
        }
    }
}
