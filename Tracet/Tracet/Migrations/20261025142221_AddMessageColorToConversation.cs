using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tracet.Migrations
{
    /// <inheritdoc />
    public partial class AddMessageColorToConversation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MessageColor",
                table: "Conversations",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MessageColor",
                table: "Conversations");
        }
    }
}
