using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tracet.Migrations
{

    public partial class AddLocationTagCount : Migration
    {

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TagCount",
                table: "LocationTags",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }


        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TagCount",
                table: "LocationTags");
        }
    }
}
