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
                t.HasCheckConstraint("CK_AppointmentServices_Status", "[Status] IN ('REQUESTED', 'CONFIRMED', 'PERFORMED', 'POSTPONED', 'CANCELLED')");
                t.HasCheckConstraint("CK_AppointmentServices_Duration", "[DurationMinutes] > 0");
                t.HasCheckConstraint("CK_AppointmentServices_Price", "[PriceAtBooking] >= 0");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("REQUESTED");
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

            // The same service is listed once per appointment
            builder.HasIndex(x => new { x.AppointmentId, x.ServiceId })
                   .IsUnique()
                   .HasDatabaseName("UX_AppointmentServices_Appointment_Service");
            builder.HasIndex(x => x.ServiceId).HasDatabaseName("IX_AppointmentServices_ServiceId");
        }
    }
}
