using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LongevityDiet.Identity.Migrations
{
    /// <inheritdoc />
    public partial class OptInEmailDeliveryForIdentityOwner : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "EmailDeliveryAttempts",
                table: "UserNotifications",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "EmailDeliveryStatus",
                table: "UserNotifications",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "None");

            migrationBuilder.AddColumn<DateTime>(
                name: "EmailLeaseUntilUtc",
                table: "UserNotifications",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EmailQueuedAtUtc",
                table: "UserNotifications",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EmailSentAtUtc",
                table: "UserNotifications",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "EmailOptedIn",
                table: "ReminderPreferences",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_UserNotifications_EmailDeliveryStatus_EmailQueuedAtUtc",
                table: "UserNotifications",
                columns: new[] { "EmailDeliveryStatus", "EmailQueuedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserNotifications_EmailDeliveryStatus_EmailQueuedAtUtc",
                table: "UserNotifications");

            migrationBuilder.DropColumn(
                name: "EmailDeliveryAttempts",
                table: "UserNotifications");

            migrationBuilder.DropColumn(
                name: "EmailDeliveryStatus",
                table: "UserNotifications");

            migrationBuilder.DropColumn(
                name: "EmailLeaseUntilUtc",
                table: "UserNotifications");

            migrationBuilder.DropColumn(
                name: "EmailQueuedAtUtc",
                table: "UserNotifications");

            migrationBuilder.DropColumn(
                name: "EmailSentAtUtc",
                table: "UserNotifications");

            migrationBuilder.DropColumn(
                name: "EmailOptedIn",
                table: "ReminderPreferences");
        }
    }
}
