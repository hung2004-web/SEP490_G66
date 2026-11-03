using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OZE.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddQueueEntrySkipCount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SkipCount",
                table: "QueueEntries",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SkipCount",
                table: "QueueEntries");
        }
    }
}
