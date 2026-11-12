using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OZE.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLeaveRequestsAndCashSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CashSessions",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OpenedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    OpenedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    OpeningCash = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Open"),
                    ClosedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CashCollected = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    TransferConfirmed = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    ExpenseTotal = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    ExpectedCash = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    CountedCash = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    Difference = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    HandoverToUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "SYSDATETIMEOFFSET()"),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CashSessions", x => x.Id);
                    table.CheckConstraint("CK_CashSessions_CountedCash", "[CountedCash] IS NULL OR [CountedCash] >= 0");
                    table.CheckConstraint("CK_CashSessions_OpeningCash", "[OpeningCash] >= 0");
                    table.CheckConstraint("CK_CashSessions_Status", "[Status] IN ('Open', 'Closed')");
                    table.ForeignKey(
                        name: "FK_CashSessions_HandoverTo",
                        column: x => x.HandoverToUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CashSessions_OpenedBy",
                        column: x => x.OpenedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "LeaveRequests",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StaffProfileId = table.Column<int>(type: "int", nullable: false),
                    LeaveDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Slot = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Pending"),
                    SubstituteStaffProfileId = table.Column<int>(type: "int", nullable: true),
                    ReviewedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RejectionReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "SYSDATETIMEOFFSET()"),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeaveRequests", x => x.Id);
                    table.CheckConstraint("CK_LeaveRequests_Slot", "[Slot] IS NULL OR [Slot] IN ('Morning', 'Afternoon')");
                    table.CheckConstraint("CK_LeaveRequests_Status", "[Status] IN ('Pending', 'Approved', 'Rejected', 'Cancelled')");
                    table.ForeignKey(
                        name: "FK_LeaveRequests_ReviewedBy",
                        column: x => x.ReviewedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_LeaveRequests_StaffProfiles",
                        column: x => x.StaffProfileId,
                        principalTable: "StaffProfiles",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_LeaveRequests_Substitute",
                        column: x => x.SubstituteStaffProfileId,
                        principalTable: "StaffProfiles",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CashExpenses",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CashSessionId = table.Column<long>(type: "bigint", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Other"),
                    Description = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "SYSDATETIMEOFFSET()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CashExpenses", x => x.Id);
                    table.CheckConstraint("CK_CashExpenses_Amount", "[Amount] > 0");
                    table.CheckConstraint("CK_CashExpenses_Category", "[Category] IN ('Supplies', 'Other')");
                    table.ForeignKey(
                        name: "FK_CashExpenses_CashSessions",
                        column: x => x.CashSessionId,
                        principalTable: "CashSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CashExpenses_CreatedBy",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_CashSessions_OpenedAt",
                table: "CashSessions",
                column: "OpenedAt");

            migrationBuilder.CreateIndex(
                name: "UX_CashSessions_OneOpenPerUser",
                table: "CashSessions",
                column: "OpenedByUserId",
                unique: true,
                filter: "[Status] = 'Open'");

            migrationBuilder.CreateIndex(
                name: "IX_LeaveRequests_Pending",
                table: "LeaveRequests",
                column: "Status",
                filter: "[Status] = 'Pending'");

            migrationBuilder.CreateIndex(
                name: "IX_LeaveRequests_Staff_Date",
                table: "LeaveRequests",
                columns: new[] { "StaffProfileId", "LeaveDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CashExpenses");

            migrationBuilder.DropTable(
                name: "LeaveRequests");

            migrationBuilder.DropTable(
                name: "CashSessions");
        }
    }
}
