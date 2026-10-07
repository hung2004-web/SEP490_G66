using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class ImagingRequestConfiguration : IEntityTypeConfiguration<ImagingRequest>
    {
        public void Configure(EntityTypeBuilder<ImagingRequest> builder)
        {
            builder.ToTable("ImagingRequests", t =>
            {
                t.HasCheckConstraint("CK_ImagingRequests_Status", "[RequestStatus] IN ('Pending', 'InProgress', 'Completed', 'Cancelled')");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.ImagingType).HasMaxLength(50).IsRequired();
            builder.Property(x => x.TargetArea).HasMaxLength(200);
            builder.Property(x => x.RequestStatus).HasMaxLength(20).HasDefaultValue("Pending");
            builder.Property(x => x.ClinicalIndication).HasMaxLength(500);
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.Examination)
                   .WithMany(x => x.ImagingRequests)
                   .HasForeignKey(x => x.ExaminationId)
                   .HasConstraintName("FK_ImagingRequests_Examinations")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(x => x.RequestedByDoctor)
                   .WithMany()
                   .HasForeignKey(x => x.RequestedByDoctorId)
                   .HasConstraintName("FK_ImagingRequests_Doctors")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => x.ExaminationId).HasDatabaseName("IX_ImagingRequests_ExaminationId");
            builder.HasIndex(x => new { x.RequestStatus, x.CreatedAt })
                   .HasDatabaseName("IX_ImagingRequests_Status")
                   .HasFilter("[RequestStatus] = 'Pending'");
        }
    }
}
