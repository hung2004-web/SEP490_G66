using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class AppointmentServiceItemConfiguration : IEntityTypeConfiguration<AppointmentServiceItem>
    {
        public void Configure(EntityTypeBuilder<AppointmentServiceItem> builder)
        {
            builder.ToTable("AppointmentServices", t =>
            {
                t.HasCheckConstraint("CK_AppointmentServices_Duration", "[DurationMinutes] > 0");
                t.HasCheckConstraint("CK_AppointmentServices_Price", "[PriceAtBooking] >= 0");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.PriceAtBooking).HasPrecision(18, 2);
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne(x => x.Appointment)
                   .WithMany(x => x.ServiceItems)
                   .HasForeignKey(x => x.AppointmentId)
                   .HasConstraintName("FK_AppointmentServices_Appointments")
                   .OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(x => x.Service)
                   .WithMany()
                   .HasForeignKey(x => x.ServiceId)
                   .HasConstraintName("FK_AppointmentServices_Services")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasOne(x => x.Variant)
                   .WithMany()
                   .HasForeignKey(x => x.VariantId)
                   .HasConstraintName("FK_AppointmentServices_ServiceVariants")
                   .OnDelete(DeleteBehavior.NoAction);

            // The same service, or the same variant of a service, is listed once per appointment.
            // SQL Server treats NULL as one value here, so the whole service also appears once
            builder.HasIndex(x => new { x.AppointmentId, x.ServiceId, x.VariantId })
                   .IsUnique()
                   .HasFilter(null)
                   .HasDatabaseName("UX_AppointmentServices_Appointment_Service_Variant");
            builder.HasIndex(x => x.ServiceId).HasDatabaseName("IX_AppointmentServices_ServiceId");
            builder.HasIndex(x => x.VariantId).HasDatabaseName("IX_AppointmentServices_VariantId");
        }
    }
}
