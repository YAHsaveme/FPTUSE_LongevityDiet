using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LongevityDiet.Worker.Ops.Migrations
{
    /// <inheritdoc />
    public partial class InitialWorkerOpsEventAudit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WorkerEventDeadLetters",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Source = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    RedisStreamId = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    EventType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ReasonCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    RejectedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsResolved = table.Column<bool>(type: "bit", nullable: false),
                    ResolvedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkerEventDeadLetters", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WorkerReceivedEvents",
                columns: table => new
                {
                    Source = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    EventId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EventType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    RedisStreamId = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    ReceivedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkerReceivedEvents", x => new { x.Source, x.EventId });
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkerEventDeadLetters_IsResolved_RejectedAtUtc",
                table: "WorkerEventDeadLetters",
                columns: new[] { "IsResolved", "RejectedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_WorkerEventDeadLetters_Source_RedisStreamId",
                table: "WorkerEventDeadLetters",
                columns: new[] { "Source", "RedisStreamId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkerReceivedEvents_ReceivedAtUtc",
                table: "WorkerReceivedEvents",
                column: "ReceivedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_WorkerReceivedEvents_Source_EventType",
                table: "WorkerReceivedEvents",
                columns: new[] { "Source", "EventType" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WorkerEventDeadLetters");

            migrationBuilder.DropTable(
                name: "WorkerReceivedEvents");
        }
    }
}
