using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tracet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Pins_UserId",
                table: "Pins");

            migrationBuilder.DropIndex(
                name: "IX_Messages_ConversationId",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_Friendships_FriendId",
                table: "Friendships");

            migrationBuilder.DropIndex(
                name: "IX_Friendships_UserId",
                table: "Friendships");

            migrationBuilder.DropIndex(
                name: "IX_AIChatHistories_UserId",
                table: "AIChatHistories");

            migrationBuilder.CreateIndex(
                name: "IX_Pins_UserId_CreatedAt",
                table: "Pins",
                columns: new[] { "UserId", "CreatedAt" },
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "IX_Pins_UserId_VisitedAt",
                table: "Pins",
                columns: new[] { "UserId", "VisitedAt" },
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "IX_Messages_ConversationId_SentAt",
                table: "Messages",
                columns: new[] { "ConversationId", "SentAt" },
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "IX_Locations_Latitude_Longitude",
                table: "Locations",
                columns: new[] { "Latitude", "Longitude" });

            migrationBuilder.CreateIndex(
                name: "IX_Friendships_FriendId_Status",
                table: "Friendships",
                columns: new[] { "FriendId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Friendships_UserId_Status",
                table: "Friendships",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_User1Id",
                table: "Conversations",
                column: "User1Id");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_User2Id",
                table: "Conversations",
                column: "User2Id");

            migrationBuilder.CreateIndex(
                name: "IX_AIChatHistories_UserId_Provider_Timestamp",
                table: "AIChatHistories",
                columns: new[] { "UserId", "Provider", "Timestamp" },
                descending: new bool[0]);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Pins_UserId_CreatedAt",
                table: "Pins");

            migrationBuilder.DropIndex(
                name: "IX_Pins_UserId_VisitedAt",
                table: "Pins");

            migrationBuilder.DropIndex(
                name: "IX_Messages_ConversationId_SentAt",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_Locations_Latitude_Longitude",
                table: "Locations");

            migrationBuilder.DropIndex(
                name: "IX_Friendships_FriendId_Status",
                table: "Friendships");

            migrationBuilder.DropIndex(
                name: "IX_Friendships_UserId_Status",
                table: "Friendships");

            migrationBuilder.DropIndex(
                name: "IX_Conversations_User1Id",
                table: "Conversations");

            migrationBuilder.DropIndex(
                name: "IX_Conversations_User2Id",
                table: "Conversations");

            migrationBuilder.DropIndex(
                name: "IX_AIChatHistories_UserId_Provider_Timestamp",
                table: "AIChatHistories");

            migrationBuilder.CreateIndex(
                name: "IX_Pins_UserId",
                table: "Pins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_ConversationId",
                table: "Messages",
                column: "ConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_Friendships_FriendId",
                table: "Friendships",
                column: "FriendId");

            migrationBuilder.CreateIndex(
                name: "IX_Friendships_UserId",
                table: "Friendships",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AIChatHistories_UserId",
                table: "AIChatHistories",
                column: "UserId");
        }
    }
}
