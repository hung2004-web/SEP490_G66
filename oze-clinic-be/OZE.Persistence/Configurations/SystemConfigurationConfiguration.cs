using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Domain.Entities;

namespace OZE.Persistence.Configurations
{
    public class SystemConfigurationConfiguration : IEntityTypeConfiguration<SystemConfiguration>
    {
        public void Configure(EntityTypeBuilder<SystemConfiguration> builder)
        {
            builder.ToTable("SystemConfigurations", t =>
            {
                t.HasCheckConstraint("CK_SystemConfigurations_DataType", "[DataType] IN ('String', 'Int', 'Bool', 'Decimal', 'Json')");
            });
            builder.HasKey(x => x.Id);

            builder.Property(x => x.ConfigKey).HasMaxLength(100).IsRequired();
            builder.Property(x => x.ConfigValue).HasMaxLength(500).IsRequired();
            builder.Property(x => x.DataType).HasMaxLength(20).HasDefaultValue("String");
            builder.Property(x => x.Description).HasMaxLength(500);

            builder.HasOne<ApplicationUser>()
                   .WithMany()
                   .HasForeignKey(x => x.UpdatedByUserId)
                   .HasConstraintName("FK_SystemConfigurations_UpdatedBy")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => x.ConfigKey).HasDatabaseName("IX_SystemConfigurations_ConfigKey").IsUnique();

            builder.HasData(
                new SystemConfiguration { Id = 1, ConfigKey = "Booking.MaxDaysAhead", ConfigValue = "30", DataType = "Int", Description = "Số ngày tối đa cho phép đặt lịch trước" },
                new SystemConfiguration { Id = 2, ConfigKey = "Booking.MinHoursAhead", ConfigValue = "2", DataType = "Int", Description = "Số giờ tối thiểu trước giờ hẹn để đặt lịch" },
                new SystemConfiguration { Id = 3, ConfigKey = "CheckIn.EarlyMinutes", ConfigValue = "30", DataType = "Int", Description = "Số phút cho phép check-in sớm trước giờ hẹn" },
                new SystemConfiguration { Id = 4, ConfigKey = "CheckIn.LateMinutes", ConfigValue = "15", DataType = "Int", Description = "Số phút đến muộn trước khi đánh dấu NO_SHOW" },
                new SystemConfiguration { Id = 5, ConfigKey = "Queue.AutoExpireMinutes", ConfigValue = "60", DataType = "Int", Description = "Số phút chờ tối đa trong hàng chờ trước khi tự hủy" },
                new SystemConfiguration { Id = 6, ConfigKey = "Clinic.WorkStartTime", ConfigValue = "08:00", DataType = "String", Description = "Giờ bắt đầu làm việc" },
                new SystemConfiguration { Id = 7, ConfigKey = "Clinic.WorkEndTime", ConfigValue = "17:00", DataType = "String", Description = "Giờ kết thúc làm việc" },
                new SystemConfiguration { Id = 8, ConfigKey = "Clinic.SlotDurationMinutes", ConfigValue = "30", DataType = "Int", Description = "Thời lượng mỗi slot hẹn (phút)" });
        }
    }
}
