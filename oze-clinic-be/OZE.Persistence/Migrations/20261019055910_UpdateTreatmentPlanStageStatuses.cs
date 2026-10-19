using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OZE.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UpdateTreatmentPlanStageStatuses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TreatmentPlanStages_ScheduledDate",
                table: "TreatmentPlanStages");

            migrationBuilder.DropCheckConstraint(
                name: "CK_TreatmentPlanStages_Status",
                table: "TreatmentPlanStages");

            // Rename legacy Planned status before applying the narrowed check constraint.
            migrationBuilder.Sql(
                "UPDATE [TreatmentPlanStages] SET [StageStatus] = N'Scheduled' WHERE [StageStatus] = N'Planned'");

            migrationBuilder.AlterColumn<string>(
                name: "StageStatus",
                table: "TreatmentPlanStages",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Scheduled",
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20,
                oldDefaultValue: "Planned");

            migrationBuilder.CreateIndex(
                name: "IX_TreatmentPlanStages_ScheduledDate",
                table: "TreatmentPlanStages",
                column: "ScheduledDate",
                filter: "[StageStatus] = 'Scheduled'");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TreatmentPlanStages_Status",
                table: "TreatmentPlanStages",
                sql: "[StageStatus] IN ('Scheduled', 'InProgress', 'Completed', 'Cancelled')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TreatmentPlanStages_ScheduledDate",
                table: "TreatmentPlanStages");

            migrationBuilder.DropCheckConstraint(
                name: "CK_TreatmentPlanStages_Status",
                table: "TreatmentPlanStages");

            migrationBuilder.AlterColumn<string>(
                name: "StageStatus",
                table: "TreatmentPlanStages",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Planned",
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20,
                oldDefaultValue: "Scheduled");

            migrationBuilder.CreateIndex(
                name: "IX_TreatmentPlanStages_ScheduledDate",
                table: "TreatmentPlanStages",
                column: "ScheduledDate",
                filter: "[StageStatus] IN ('Planned', 'Scheduled')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TreatmentPlanStages_Status",
                table: "TreatmentPlanStages",
                sql: "[StageStatus] IN ('Planned', 'Scheduled', 'InProgress', 'Completed', 'Cancelled')");
        }
    }
}
