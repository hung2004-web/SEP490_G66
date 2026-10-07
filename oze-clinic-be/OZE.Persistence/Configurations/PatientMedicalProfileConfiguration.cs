using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class PatientMedicalProfileConfiguration : IEntityTypeConfiguration<PatientMedicalProfile>
    {
        public void Configure(EntityTypeBuilder<PatientMedicalProfile> builder)
        {
            builder.ToTable("PatientMedicalProfiles", t =>
            {
                t.HasCheckConstraint("CK_PatientMedicalProfiles_RecordType", "[RecordType] IN ('History', 'Condition', 'Allergy', 'Medication')");
                t.HasCheckConstraint("CK_PatientMedicalProfiles_Severity", "[Severity] IN ('Mild', 'Moderate', 'Severe')");
                t.HasCheckConstraint("CK_PatientMedicalProfiles_Status", "[Status] IN ('Active', 'Resolved', 'Discontinued')");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.RecordType).HasMaxLength(20).IsRequired();
            builder.Property(x => x.Title).HasMaxLength(200).IsRequired();
            builder.Property(x => x.Severity).HasMaxLength(20);
            builder.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("Active");
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.Patient)
                   .WithMany(x => x.MedicalProfiles)
                   .HasForeignKey(x => x.PatientId)
                   .HasConstraintName("FK_PatientMedicalProfiles_Patients")
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasOne<ApplicationUser>()
                   .WithMany()
                   .HasForeignKey(x => x.CreatedByUserId)
                   .HasConstraintName("FK_PatientMedicalProfiles_CreatedBy")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => new { x.PatientId, x.RecordType })
                   .HasDatabaseName("IX_PatientMedicalProfiles_PatientId_RecordType");
            builder.HasIndex(x => x.PatientId)
                   .HasDatabaseName("IX_PatientMedicalProfiles_ActiveAllergies")
                   .HasFilter("[RecordType] = 'Allergy' AND [Status] = 'Active'");
        }
    }
}
