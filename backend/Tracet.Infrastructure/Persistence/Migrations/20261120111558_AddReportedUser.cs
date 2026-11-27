using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tracet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddReportedUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ReportedUsers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ReporterId = table.Column<string>(type: "TEXT", nullable: false),
                    ReportedUserId = table.Column<string>(type: "TEXT", nullable: false),
                    ReportedId = table.Column<string>(type: "TEXT", nullable: true),
                    Reason = table.Column<string>(type: "TEXT", nullable: true),
                    ReportedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportedUsers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReportedUsers_Users_ReportedId",
                        column: x => x.ReportedId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ReportedUsers_Users_ReporterId",
                        column: x => x.ReporterId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReportedUsers_ReportedId",
                table: "ReportedUsers",
                column: "ReportedId");

            migrationBuilder.CreateIndex(
                name: "IX_ReportedUsers_ReporterId",
                table: "ReportedUsers",
                column: "ReporterId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReportedUsers");
        }
    }
}
