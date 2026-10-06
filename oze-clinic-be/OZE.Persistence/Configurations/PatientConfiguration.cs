using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class PatientConfiguration : IEntityTypeConfiguration<Patient>
    {
        public void Configure(EntityTypeBuilder<Patient> builder)
        {
            builder.ToTable("Patients", t =>
            {
                t.HasCheckConstraint("CK_Patients_Gender", "[Gender] IN ('Male', 'Female', 'Other')");
                t.HasCheckConstraint("CK_Patients_BloodType", "[BloodType] IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.PatientCode).HasMaxLength(20).IsRequired();
            builder.Property(x => x.FullName).HasMaxLength(200).IsRequired();
            builder.Property(x => x.PhoneNumber).HasMaxLength(20);
            builder.Property(x => x.Email).HasMaxLength(256);
            builder.Property(x => x.Gender).HasMaxLength(10);
            builder.Property(x => x.Address).HasMaxLength(500);
            builder.Property(x => x.InsuranceNumber).HasMaxLength(50);
            builder.Property(x => x.EmergencyContactName).HasMaxLength(200);
            builder.Property(x => x.EmergencyContactPhone).HasMaxLength(20);
            builder.Property(x => x.BloodType).HasMaxLength(5);
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.User)
                   .WithOne(x => x.Patient)
                   .HasForeignKey<Patient>(x => x.UserId)
                   .HasConstraintName("FK_Patients_Users")
                   .OnDelete(DeleteBehavior.SetNull);

            builder.HasIndex(x => x.PatientCode).HasDatabaseName("IX_Patients_PatientCode").IsUnique();
            builder.HasIndex(x => x.UserId)
                   .HasDatabaseName("IX_Patients_UserId")
                   .IsUnique()
                   .HasFilter("[UserId] IS NOT NULL");
            builder.HasIndex(x => x.PhoneNumber)
                   .HasDatabaseName("IX_Patients_PhoneNumber")
                   .HasFilter("[DeletedAt] IS NULL");
            builder.HasIndex(x => x.FullName)
                   .HasDatabaseName("IX_Patients_FullName")
                   .HasFilter("[DeletedAt] IS NULL");
        }
    }
}
