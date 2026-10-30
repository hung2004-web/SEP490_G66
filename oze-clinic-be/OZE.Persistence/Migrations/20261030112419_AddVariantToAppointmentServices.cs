using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OZE.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddVariantToAppointmentServices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "UX_AppointmentServices_Appointment_Service",
                table: "AppointmentServices");

            migrationBuilder.AddColumn<int>(
                name: "EstimatedMinutes",
                table: "ServiceVariants",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ReferencePrice",
                table: "ServiceVariants",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "VariantId",
                table: "AppointmentServices",
                type: "int",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_ServiceVariants_ReferencePrice",
                table: "ServiceVariants",
                sql: "[ReferencePrice] >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_AppointmentServices_VariantId",
                table: "AppointmentServices",
                column: "VariantId");

            migrationBuilder.CreateIndex(
                name: "UX_AppointmentServices_Appointment_Service_Variant",
                table: "AppointmentServices",
                columns: new[] { "AppointmentId", "ServiceId", "VariantId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_AppointmentServices_ServiceVariants",
                table: "AppointmentServices",
                column: "VariantId",
                principalTable: "ServiceVariants",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AppointmentServices_ServiceVariants",
                table: "AppointmentServices");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ServiceVariants_ReferencePrice",
                table: "ServiceVariants");

            migrationBuilder.DropIndex(
                name: "IX_AppointmentServices_VariantId",
                table: "AppointmentServices");

            migrationBuilder.DropIndex(
                name: "UX_AppointmentServices_Appointment_Service_Variant",
                table: "AppointmentServices");

            migrationBuilder.DropColumn(
                name: "EstimatedMinutes",
                table: "ServiceVariants");

            migrationBuilder.DropColumn(
                name: "ReferencePrice",
                table: "ServiceVariants");

            migrationBuilder.DropColumn(
                name: "VariantId",
                table: "AppointmentServices");

            migrationBuilder.CreateIndex(
                name: "UX_AppointmentServices_Appointment_Service",
                table: "AppointmentServices",
                columns: new[] { "AppointmentId", "ServiceId" },
                unique: true);
        }
    }
}
