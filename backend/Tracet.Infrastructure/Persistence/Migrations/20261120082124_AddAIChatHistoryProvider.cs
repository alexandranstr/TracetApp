using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tracet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAIChatHistoryProvider : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Provider",
                table: "AIChatHistories",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Provider",
                table: "AIChatHistories");
        }
    }
}
