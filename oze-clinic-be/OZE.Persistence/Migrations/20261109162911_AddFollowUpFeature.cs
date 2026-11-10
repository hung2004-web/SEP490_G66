using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OZE.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFollowUpFeature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "FollowUpAppointmentId",
                table: "Examinations",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "FollowUpDate",
                table: "Examinations",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FollowUpNotes",
                table: "Examinations",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "FollowUpRemindedAt",
                table: "Examinations",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "FollowUpReminderCount",
                table: "Examinations",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<long>(
                name: "ParentAppointmentId",
                table: "Appointments",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Examinations_FollowUpDate",
                table: "Examinations",
                column: "FollowUpDate");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_ParentAppointmentId",
                table: "Appointments",
                column: "ParentAppointmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_Appointments_ParentAppointment",
                table: "Appointments",
                column: "ParentAppointmentId",
                principalTable: "Appointments",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Examinations_FollowUpAppointments",
                table: "Examinations",
                column: "FollowUpAppointmentId",
                principalTable: "Appointments",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Appointments_ParentAppointment",
                table: "Appointments");

            migrationBuilder.DropForeignKey(
                name: "FK_Examinations_FollowUpAppointments",
                table: "Examinations");

            migrationBuilder.DropIndex(
                name: "IX_Examinations_FollowUpDate",
                table: "Examinations");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_ParentAppointmentId",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "FollowUpAppointmentId",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "FollowUpDate",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "FollowUpNotes",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "FollowUpRemindedAt",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "FollowUpReminderCount",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "ParentAppointmentId",
                table: "Appointments");
        }
    }
}
