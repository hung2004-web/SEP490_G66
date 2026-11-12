using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class LeaveRequestConfiguration : IEntityTypeConfiguration<LeaveRequest>
    {
        public void Configure(EntityTypeBuilder<LeaveRequest> builder)
        {
            builder.ToTable("LeaveRequests", t =>
            {
                t.HasCheckConstraint("CK_LeaveRequests_Status", "[Status] IN ('Pending', 'Approved', 'Rejected', 'Cancelled')");
                t.HasCheckConstraint("CK_LeaveRequests_Slot", "[Slot] IS NULL OR [Slot] IN ('Morning', 'Afternoon')");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Slot).HasMaxLength(20);
            builder.Property(x => x.Reason).HasMaxLength(500).IsRequired();
            builder.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("Pending");
            builder.Property(x => x.RejectionReason).HasMaxLength(500);
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.StaffProfile)
                   .WithMany()
                   .HasForeignKey(x => x.StaffProfileId)
                   .HasConstraintName("FK_LeaveRequests_StaffProfiles")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(x => x.SubstituteStaffProfile)
                   .WithMany()
                   .HasForeignKey(x => x.SubstituteStaffProfileId)
                   .HasConstraintName("FK_LeaveRequests_Substitute")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne<ApplicationUser>()
                   .WithMany()
                   .HasForeignKey(x => x.ReviewedByUserId)
                   .HasConstraintName("FK_LeaveRequests_ReviewedBy")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => new { x.StaffProfileId, x.LeaveDate }).HasDatabaseName("IX_LeaveRequests_Staff_Date");
            builder.HasIndex(x => x.Status)
                   .HasDatabaseName("IX_LeaveRequests_Pending")
                   .HasFilter("[Status] = 'Pending'");
        }
    }
}
