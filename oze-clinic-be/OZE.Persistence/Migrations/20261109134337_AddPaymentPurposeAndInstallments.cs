using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OZE.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentPurposeAndInstallments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "WorkDoneAmount",
                table: "RefundAdjustmentRequests",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "InstallmentPeriodId",
                table: "Payments",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Purpose",
                table: "Payments",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Regular");

            migrationBuilder.CreateTable(
                name: "InstallmentPlans",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InvoiceId = table.Column<long>(type: "bigint", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "SYSDATETIMEOFFSET()"),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InstallmentPlans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InstallmentPlans_CreatedBy",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InstallmentPlans_Invoices",
                        column: x => x.InvoiceId,
                        principalTable: "Invoices",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "InstallmentPeriods",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InstallmentPlanId = table.Column<long>(type: "bigint", nullable: false),
                    Sequence = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Pending"),
                    PaidAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    PaymentId = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InstallmentPeriods", x => x.Id);
                    table.CheckConstraint("CK_InstallmentPeriods_Amount", "[Amount] > 0");
                    table.CheckConstraint("CK_InstallmentPeriods_Paid", "[Status] <> 'Paid' OR ([PaymentId] IS NOT NULL AND [PaidAt] IS NOT NULL)");
                    table.CheckConstraint("CK_InstallmentPeriods_Sequence", "[Sequence] > 0");
                    table.CheckConstraint("CK_InstallmentPeriods_Status", "[Status] IN ('Pending', 'Paid', 'Overdue')");
                    table.CheckConstraint("CK_InstallmentPeriods_Unpaid", "[Status] = 'Paid' OR [PaymentId] IS NULL");
                    table.ForeignKey(
                        name: "FK_InstallmentPeriods_Payments",
                        column: x => x.PaymentId,
                        principalTable: "Payments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InstallmentPeriods_Plans",
                        column: x => x.InstallmentPlanId,
                        principalTable: "InstallmentPlans",
                        principalColumn: "Id");
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_RefundAdjustments_WorkDone",
                table: "RefundAdjustmentRequests",
                sql: "[WorkDoneAmount] IS NULL OR [WorkDoneAmount] >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_InstallmentPeriodId",
                table: "Payments",
                column: "InstallmentPeriodId",
                unique: true,
                filter: "[InstallmentPeriodId] IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Payments_InstallmentPeriod",
                table: "Payments",
                sql: "[Purpose] <> 'Installment' OR [InstallmentPeriodId] IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Payments_Purpose",
                table: "Payments",
                sql: "[Purpose] IN ('Deposit', 'Regular', 'Installment')");

            migrationBuilder.CreateIndex(
                name: "IX_InstallmentPeriods_DueDate_Status",
                table: "InstallmentPeriods",
                columns: new[] { "DueDate", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_InstallmentPeriods_PaymentId",
                table: "InstallmentPeriods",
                column: "PaymentId",
                unique: true,
                filter: "[PaymentId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_InstallmentPeriods_PlanId_Sequence",
                table: "InstallmentPeriods",
                columns: new[] { "InstallmentPlanId", "Sequence" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InstallmentPlans_InvoiceId",
                table: "InstallmentPlans",
                column: "InvoiceId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Payments_InstallmentPeriods",
                table: "Payments",
                column: "InstallmentPeriodId",
                principalTable: "InstallmentPeriods",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Payments_InstallmentPeriods",
                table: "Payments");

            migrationBuilder.DropTable(
                name: "InstallmentPeriods");

            migrationBuilder.DropTable(
                name: "InstallmentPlans");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RefundAdjustments_WorkDone",
                table: "RefundAdjustmentRequests");

            migrationBuilder.DropIndex(
                name: "IX_Payments_InstallmentPeriodId",
                table: "Payments");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Payments_InstallmentPeriod",
                table: "Payments");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Payments_Purpose",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "WorkDoneAmount",
                table: "RefundAdjustmentRequests");

            migrationBuilder.DropColumn(
                name: "InstallmentPeriodId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "Purpose",
                table: "Payments");
        }
    }
}
