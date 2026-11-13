using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OZE.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerCareAndReconciliation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RecallIntervalMonths",
                table: "Services",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "FollowUpClosed",
                table: "Examinations",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "FollowUpIsRecall",
                table: "Examinations",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "DailyReconciliations",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClinicDate = table.Column<DateOnly>(type: "date", nullable: false),
                    SessionCount = table.Column<int>(type: "int", nullable: false),
                    CashCollected = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CashExpected = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CashCounted = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CashDifference = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TransferConfirmed = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PendingTransferCount = table.Column<int>(type: "int", nullable: false),
                    PendingTransferAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    RefundTotal = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ConfirmedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ConfirmedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyReconciliations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DailyReconciliations_ConfirmedBy",
                        column: x => x.ConfirmedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "FollowUpContacts",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ExaminationId = table.Column<long>(type: "bigint", nullable: false),
                    Outcome = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CallBackDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "SYSDATETIMEOFFSET()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FollowUpContacts", x => x.Id);
                    table.CheckConstraint("CK_FollowUpContacts_Outcome", "[Outcome] IN ('Booked', 'CallBack', 'Unreachable', 'Declined')");
                    table.ForeignKey(
                        name: "FK_FollowUpContacts_CreatedBy",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_FollowUpContacts_Examinations",
                        column: x => x.ExaminationId,
                        principalTable: "Examinations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PaymentReminders",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InvoiceId = table.Column<long>(type: "bigint", nullable: false),
                    InstallmentPeriodId = table.Column<long>(type: "bigint", nullable: true),
                    Channels = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    IsAutomatic = table.Column<bool>(type: "bit", nullable: false),
                    SentByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    SentAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentReminders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentReminders_InstallmentPeriods",
                        column: x => x.InstallmentPeriodId,
                        principalTable: "InstallmentPeriods",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_PaymentReminders_Invoices",
                        column: x => x.InvoiceId,
                        principalTable: "Invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "UX_DailyReconciliations_ClinicDate",
                table: "DailyReconciliations",
                column: "ClinicDate",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FollowUpContacts_Exam_Created",
                table: "FollowUpContacts",
                columns: new[] { "ExaminationId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentReminders_Invoice_Sent",
                table: "PaymentReminders",
                columns: new[] { "InvoiceId", "SentAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DailyReconciliations");

            migrationBuilder.DropTable(
                name: "FollowUpContacts");

            migrationBuilder.DropTable(
                name: "PaymentReminders");

            migrationBuilder.DropColumn(
                name: "RecallIntervalMonths",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "FollowUpClosed",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "FollowUpIsRecall",
                table: "Examinations");
        }
    }
}
