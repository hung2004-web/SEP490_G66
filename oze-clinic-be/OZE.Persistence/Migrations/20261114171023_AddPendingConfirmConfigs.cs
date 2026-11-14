using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OZE.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPendingConfirmConfigs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Inserted by key, not by id: databases set up by the sample data seeder already hold rows with ids after 9
            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM SystemConfigurations WHERE ConfigKey = N'Booking.PendingConfirmHours')
    INSERT INTO SystemConfigurations (ConfigKey, ConfigValue, DataType, Description)
    VALUES (N'Booking.PendingConfirmHours', N'4', N'Int', N'Lịch chờ xác nhận quá số giờ này kể từ lúc đặt thì cảnh báo lễ tân');
IF NOT EXISTS (SELECT 1 FROM SystemConfigurations WHERE ConfigKey = N'Booking.PendingVisitSoonHours')
    INSERT INTO SystemConfigurations (ConfigKey, ConfigValue, DataType, Description)
    VALUES (N'Booking.PendingVisitSoonHours', N'24', N'Int', N'Lịch chờ xác nhận còn ít hơn số giờ này tới giờ khám thì cảnh báo lễ tân');");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DELETE FROM SystemConfigurations WHERE ConfigKey IN (N'Booking.PendingConfirmHours', N'Booking.PendingVisitSoonHours');");
        }
    }
}
