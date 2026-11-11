using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LongevityDiet.Planning.Migrations
{
    /// <inheritdoc />
    public partial class SingleActiveChallengePerUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_UserChallenges_UserId",
                table: "UserChallenges",
                column: "UserId",
                unique: true,
                filter: "[Status] = N'Active'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserChallenges_UserId",
                table: "UserChallenges");
        }
    }
}
