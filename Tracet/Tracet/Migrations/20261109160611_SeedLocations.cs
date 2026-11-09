using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Tracet.Migrations
{
    /// <inheritdoc />
    public partial class SeedLocations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Locations",
                columns: new[] { "Id", "Address", "CityName", "CountryName", "EntityType", "GooglePlaceId", "Latitude", "Longitude", "PlaceName" },
                values: new object[,]
                {
                    { 7, null, "Tokyo", "Japan", 0, null, 35.6586, 139.74539999999999, "Tokyo Tower" },
                    { 8, null, "New York", "USA", 0, null, 40.782899999999998, -73.965400000000002, "Central Park" },
                    { 9, null, "Barcelona", "Spain", 0, null, 41.403599999999997, 2.1743999999999999, "Sagrada Familia" },
                    { 10, null, "Sydney", "Australia", 0, null, -33.8568, 151.21530000000001, "Sydney Opera House" },
                    { 11, null, "Cusco", "Peru", 0, null, -13.1631, -72.545000000000002, "Machu Picchu" },
                    { 12, null, "Santorini", "Greece", 0, null, 36.3932, 25.461500000000001, "Santorini" },
                    { 13, null, "Bangkok", "Thailand", 0, null, 13.7563, 100.5018, "Bangkok" },
                    { 14, null, "Lisbon", "Portugal", 0, null, 38.722299999999997, -9.1393000000000004, "Lisbon" },
                    { 15, null, "Cape Town", "South Africa", 0, null, -33.924900000000001, 18.424099999999999, "Cape Town" },
                    { 16, null, "Reykjavik", "Iceland", 0, null, 64.146600000000007, -21.942599999999999, "Reykjavik" }
                });

            migrationBuilder.InsertData(
                table: "LocationTags",
                columns: new[] { "LocationId", "TagId", "TagCount" },
                values: new object[,]
                {
                    { 7, 1, 2 },
                    { 7, 8, 4 },
                    { 7, 11, 3 },
                    { 7, 12, 2 },
                    { 8, 4, 2 },
                    { 8, 5, 3 },
                    { 8, 7, 3 },
                    { 8, 9, 4 },
                    { 9, 3, 3 },
                    { 9, 6, 5 },
                    { 9, 7, 2 },
                    { 9, 11, 4 },
                    { 10, 2, 3 },
                    { 10, 6, 2 },
                    { 10, 7, 5 },
                    { 10, 11, 4 },
                    { 11, 6, 4 },
                    { 11, 7, 4 },
                    { 11, 9, 3 },
                    { 11, 12, 5 },
                    { 12, 2, 5 },
                    { 12, 5, 2 },
                    { 12, 7, 5 },
                    { 12, 8, 3 },
                    { 13, 1, 4 },
                    { 13, 8, 5 },
                    { 13, 10, 3 },
                    { 13, 11, 2 },
                    { 14, 2, 2 },
                    { 14, 3, 4 },
                    { 14, 6, 3 },
                    { 14, 8, 3 },
                    { 15, 7, 3 },
                    { 15, 9, 5 },
                    { 15, 10, 2 },
                    { 15, 12, 4 },
                    { 16, 3, 3 },
                    { 16, 5, 3 },
                    { 16, 9, 4 },
                    { 16, 12, 4 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 7, 1 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 7, 8 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 7, 11 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 7, 12 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 8, 4 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 8, 5 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 8, 7 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 8, 9 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 9, 3 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 9, 6 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 9, 7 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 9, 11 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 10, 2 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 10, 6 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 10, 7 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 10, 11 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 11, 6 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 11, 7 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 11, 9 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 11, 12 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 12, 2 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 12, 5 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 12, 7 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 12, 8 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 13, 1 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 13, 8 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 13, 10 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 13, 11 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 14, 2 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 14, 3 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 14, 6 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 14, 8 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 15, 7 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 15, 9 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 15, 10 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 15, 12 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 16, 3 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 16, 5 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 16, 9 });

            migrationBuilder.DeleteData(
                table: "LocationTags",
                keyColumns: new[] { "LocationId", "TagId" },
                keyValues: new object[] { 16, 12 });

            migrationBuilder.DeleteData(
                table: "Locations",
                keyColumn: "Id",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Locations",
                keyColumn: "Id",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "Locations",
                keyColumn: "Id",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "Locations",
                keyColumn: "Id",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "Locations",
                keyColumn: "Id",
                keyValue: 11);

            migrationBuilder.DeleteData(
                table: "Locations",
                keyColumn: "Id",
                keyValue: 12);

            migrationBuilder.DeleteData(
                table: "Locations",
                keyColumn: "Id",
                keyValue: 13);

            migrationBuilder.DeleteData(
                table: "Locations",
                keyColumn: "Id",
                keyValue: 14);

            migrationBuilder.DeleteData(
                table: "Locations",
                keyColumn: "Id",
                keyValue: 15);

            migrationBuilder.DeleteData(
                table: "Locations",
                keyColumn: "Id",
                keyValue: 16);
        }
    }
}
