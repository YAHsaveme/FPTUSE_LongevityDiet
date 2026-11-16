using LongevityDiet.Repositories;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LongevityDiet.Repositories.Migrations;

[DbContext(typeof(LongevityDietDbContext))]
[Migration("20261116130000_MemberAccountStatusAudit")]
public sealed class MemberAccountStatusAudit : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        var sql = ActiveProvider.Contains("SqlServer", StringComparison.OrdinalIgnoreCase);
        migrationBuilder.AddColumn<int>(
            name: "SessionVersion",
            table: "Users",
            type: sql ? "int" : "INTEGER",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.CreateTable(
            name: "MemberAccountAudits",
            columns: table => new
            {
                Id = table.Column<Guid>(type: sql ? "uniqueidentifier" : "TEXT", nullable: false),
                MemberId = table.Column<Guid>(type: sql ? "uniqueidentifier" : "TEXT", nullable: false),
                ActorAdminId = table.Column<Guid>(type: sql ? "uniqueidentifier" : "TEXT", nullable: false),
                PreviousStatus = table.Column<string>(type: sql ? "nvarchar(24)" : "TEXT", maxLength: 24, nullable: false),
                NewStatus = table.Column<string>(type: sql ? "nvarchar(24)" : "TEXT", maxLength: 24, nullable: false),
                Reason = table.Column<string>(type: sql ? "nvarchar(300)" : "TEXT", maxLength: 300, nullable: false),
                ChangedAt = table.Column<DateTimeOffset>(type: sql ? "datetimeoffset" : "TEXT", nullable: false),
            },
            constraints: table => table.PrimaryKey("PK_MemberAccountAudits", x => x.Id));
        migrationBuilder.CreateIndex(
            name: "IX_MemberAccountAudits_MemberId_ChangedAt",
            table: "MemberAccountAudits", columns: new[] { "MemberId", "ChangedAt" });
        migrationBuilder.CreateIndex(
            name: "IX_MemberAccountAudits_ActorAdminId_ChangedAt",
            table: "MemberAccountAudits", columns: new[] { "ActorAdminId", "ChangedAt" });
    }

    protected override void Down(MigrationBuilder migrationBuilder) =>
        throw new NotSupportedException("Member account audit history is append-only. Destructive rollback is blocked.");
}
