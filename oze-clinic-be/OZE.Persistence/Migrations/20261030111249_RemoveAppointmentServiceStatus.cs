using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OZE.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveAppointmentServiceStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_AppointmentServices_Status",
                table: "AppointmentServices");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "AppointmentServices");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "AppointmentServices",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "REQUESTED");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AppointmentServices_Status",
                table: "AppointmentServices",
                sql: "[Status] IN ('REQUESTED', 'CONFIRMED', 'PERFORMED', 'POSTPONED', 'CANCELLED')");
        }
    }
}
