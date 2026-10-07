using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class ImagingResultConfiguration : IEntityTypeConfiguration<ImagingResult>
    {
        public void Configure(EntityTypeBuilder<ImagingResult> builder)
        {
            builder.ToTable("ImagingResults", t =>
            {
                t.HasCheckConstraint("CK_ImagingResults_ReviewStatus", "[ReviewStatus] IN ('Pending', 'Reviewed', 'Rejected')");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.FilePath).HasMaxLength(1000).IsRequired();
            builder.Property(x => x.FileName).HasMaxLength(500).IsRequired();
            builder.Property(x => x.MimeType).HasMaxLength(100);
            builder.Property(x => x.ReviewStatus).HasMaxLength(20).HasDefaultValue("Pending");
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.ImagingRequest)
                   .WithMany(x => x.Results)
                   .HasForeignKey(x => x.ImagingRequestId)
                   .HasConstraintName("FK_ImagingResults_Requests")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(x => x.UploadedByTechnician)
                   .WithMany()
                   .HasForeignKey(x => x.UploadedByTechnicianId)
                   .HasConstraintName("FK_ImagingResults_Technician")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne(x => x.ReviewedByDoctor)
                   .WithMany()
                   .HasForeignKey(x => x.ReviewedByDoctorId)
                   .HasConstraintName("FK_ImagingResults_ReviewDoctor")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => x.ImagingRequestId).HasDatabaseName("IX_ImagingResults_RequestId");
            builder.HasIndex(x => x.ReviewStatus)
                   .HasDatabaseName("IX_ImagingResults_ReviewStatus")
                   .HasFilter("[ReviewStatus] = 'Pending'");
        }
    }
}
