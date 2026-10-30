using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OZE.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSurgeryRoomType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Services_RequiredRoomType",
                table: "Services");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Rooms_RoomType",
                table: "Rooms");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Services_RequiredRoomType",
                table: "Services",
                sql: "[RequiredRoomType] IN ('General', 'Imaging', 'Treatment', 'Surgery')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Rooms_RoomType",
                table: "Rooms",
                sql: "[RoomType] IN ('General', 'Imaging', 'Treatment', 'Surgery')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Services_RequiredRoomType",
                table: "Services");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Rooms_RoomType",
                table: "Rooms");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Services_RequiredRoomType",
                table: "Services",
                sql: "[RequiredRoomType] IN ('General', 'Imaging', 'Treatment')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Rooms_RoomType",
                table: "Rooms",
                sql: "[RoomType] IN ('General', 'Imaging', 'Treatment')");
        }
    }
}
