using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OZE.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRoleStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CreatedAt",
                table: "AspNetRoles",
                type: "datetimeoffset",
                nullable: false,
                defaultValueSql: "SYSDATETIMEOFFSET()");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "AspNetRoles",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "AspNetRoles",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAt",
                table: "AspNetRoles",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "8d04dce2-969a-435d-bba4-df3f325983dc",
                columns: new[] { "CreatedAt", "Description", "IsActive", "UpdatedAt" },
                values: new object[] { new DateTimeOffset(new DateTime(2026, 10, 6, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "A person receiving dental care at the clinic who has a patient account.", true, null });

            migrationBuilder.UpdateData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "a1f4c1b5-7b2e-4c6e-9f3a-2d5e8b7c9a01",
                columns: new[] { "CreatedAt", "Description", "IsActive", "UpdatedAt" },
                values: new object[] { new DateTimeOffset(new DateTime(2026, 10, 6, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "A dentist who examines patients, makes diagnoses and provides treatment.", true, null });

            migrationBuilder.UpdateData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "b2e5d2c6-8c3f-4d7f-a04b-3e6f9c8dab02",
                columns: new[] { "CreatedAt", "Description", "IsActive", "UpdatedAt" },
                values: new object[] { new DateTimeOffset(new DateTime(2026, 10, 6, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "A staff member who handles patient reception and front-desk operations.", true, null });

            migrationBuilder.UpdateData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "c3f6e3d7-9d40-4e80-b15c-4f70ad9ebc03",
                columns: new[] { "CreatedAt", "Description", "IsActive", "UpdatedAt" },
                values: new object[] { new DateTimeOffset(new DateTime(2026, 10, 6, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "A staff member who carries out dental imaging work and records the results.", true, null });

            migrationBuilder.UpdateData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "d4071408-ae51-4f91-a26d-5081beafcd04",
                columns: new[] { "CreatedAt", "Description", "IsActive", "UpdatedAt" },
                values: new object[] { new DateTimeOffset(new DateTime(2026, 10, 6, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "A staff member who oversees the clinic's daily operations.", true, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "AspNetRoles");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "AspNetRoles");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "AspNetRoles");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "AspNetRoles");
        }
    }
}
