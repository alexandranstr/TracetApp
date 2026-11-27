using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Tracet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SeedSpecificLocations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Tag IDs: 1-Nightlife, 2-Romantic, 3-Hidden Gem, 4-Family-Friendly, 5-Quiet & Relaxing,
            // 6-Historical, 7-Scenic View, 8-Food & Drinks, 9-Nature & Beach, 10-Budget-Friendly,
            // 11-Culture & Art, 12-Adventure

            migrationBuilder.InsertData(
                table: "Locations",
                columns: new[] { "Id", "Address", "CityName", "CountryName", "EntityType", "GooglePlaceId", "Latitude", "Longitude", "PlaceName", "Category" },
                values: new object[,]
                {
                    // === Muzee din Paris ===
                    { 101, "Rue de Rivoli", "Paris", "France", 0, null, 48.8606, 2.3376, "The Louvre", "Museum" },
                    { 102, "Grand Axe Bernadotte", "Paris", "France", 0, null, 48.8606, 2.326, "Musée d'Orsay", "Museum" },
                    { 103, "Avenue du General Eisenhower", "Paris", "France", 0, null, 48.8637, 2.297, "Musée Rodin", "Museum" },

                    // === Cafenele din Brașov ===
                    { 104, "Piața Sfatului", "Brașov", "Romania", 0, null, 45.6426, 25.5887, "Cafeneaua de pe Sfat", "Cafe" },
                    { 105, "Strada Sforii", "Brașov", "Romania", 0, null, 45.6415, 25.5895, "Cafeneaua de pe Sforii", "Cafe" },

                    // === Restaurante din Tokyo ===
                    { 106, "Ginza", "Tokyo", "Japan", 0, null, 35.6712, 139.7649, "Sukiyabashi Jiro", "Restaurant" },
                    { 107, "Shibuya", "Tokyo", "Japan", 0, null, 35.6595, 139.7004, "Ichiran Ramen Shibuya", "Restaurant" },
                    { 108, "Shinjuku", "Tokyo", "Japan", 0, null, 35.6938, 139.7034, "Omoide Yokocho", "Restaurant" },

                    // === Muzee din Londra ===
                    { 109, "Great Russell Street", "London", "UK", 0, null, 51.5194, -0.127, "British Museum", "Museum" },
                    { 110, "Tibbet Street", "London", "UK", 0, null, 51.5076, -0.1856, "Tate Modern", "Museum" },
                    { 111, "Cromwell Road", "London", "UK", 0, null, 51.4995, -0.1749, "Natural History Museum", "Museum" },

                    // === Cafenele din București ===
                    { 112, "Calea Victoriei", "București", "Romania", 0, null, 44.4422, 26.0976, "Cafeneaua de pe Victoriei", "Cafe" },
                    { 113, "Lipscani", "București", "Romania", 0, null, 44.433, 26.1025, "Cafeneaua din Lipscani", "Cafe" },

                    // === Restaurante din Barcelona ===
                    { 114, "La Rambla", "Barcelona", "Spain", 0, null, 41.3825, 2.1769, "Botafumeiro", "Restaurant" },
                    { 115, "Eixample", "Barcelona", "Spain", 0, null, 41.3948, 2.1637, "Disfrutar", "Restaurant" },
                    { 116, "Barceloneta", "Barcelona", "Spain", 0, null, 41.3795, 2.1925, "La Mar Salada", "Restaurant" },

                    // === Muzee din New York ===
                    { 117, "5th Avenue", "New York", "USA", 0, null, 40.7794, -73.9632, "The Met Museum", "Museum" },
                    { 118, "1000 5th Avenue", "New York", "USA", 0, null, 40.7789, -73.9617, "Guggenheim Museum", "Museum" },
                    { 119, "Broadway", "New York", "USA", 0, null, 40.7484, -73.9857, "MoMA", "Museum" },

                    // === Cafenele din Tokyo ===
                    { 120, "Shibuya", "Tokyo", "Japan", 0, null, 35.6595, 139.7004, "Blue Bottle Coffee Shibuya", "Cafe" },
                    { 121, "Harajuku", "Tokyo", "Japan", 0, null, 35.6702, 139.7027, "Café de l'Amour", "Cafe" },

                    // === Parcuri ===
                    { 122, "Rue de Vaugirard", "Paris", "France", 0, null, 48.8462, 2.2979, "Jardin du Luxembourg", "Park" },
                    { 123, "Hampstead", "London", "UK", 0, null, 51.5557, -0.1578, "Hampstead Heath", "Park" },
                    { 124, "Strada Republicii", "Brașov", "Romania", 0, null, 45.6455, 25.5955, "Parcul Central Brașov", "Park" },

                    // === Atracții ===
                    { 125, "Piața Sfatului", "Brașov", "Romania", 0, null, 45.6426, 25.5887, "Cathedral of St. Mary", "Attraction" },
                    { 126, "Champs-Élysées", "Paris", "France", 0, null, 48.8738, 2.295, "Eiffel Tower", "Attraction" },
                    { 127, "The Bund", "Shanghai", "China", 0, null, 31.2397, 121.4918, "The Bund", "Attraction" },
                    { 128, "Marina Bay", "Singapore", "Singapore", 0, null, 1.2834, 103.8607, "Marina Bay Sands", "Attraction" },

                    // === Restaurante din București ===
                    { 129, "Calea Victoriei", "București", "Romania", 0, null, 44.4422, 26.0976, "Hache Restaurant", "Restaurant" },
                    { 130, "Old Town", "București", "Romania", 0, null, 44.433, 26.1025, "Hanul lui Manuc", "Restaurant" },

                    // === Cafenele din Paris ===
                    { 131, "Rive Gauche", "Paris", "France", 0, null, 48.854, 2.3326, "Café de Flore", "Cafe" },
                    { 132, "Rue des Beaux-Arts", "Paris", "France", 0, null, 48.854, 2.3326, "Les Deux Magots", "Cafe" },

                    // === Muzee din Tokyo ===
                    { 133, "Ueno Park", "Tokyo", "Japan", 0, null, 35.7188, 139.7762, "Tokyo National Museum", "Museum" },
                    { 134, "Roppongi", "Tokyo", "Japan", 0, null, 35.6654, 139.7298, "TeamLab Borderless", "Museum" },

                    // === Restaurante din Londra ===
                    { 135, "Covent Garden", "London", "UK", 0, null, 51.5118, -0.1226, "Dishoom", "Restaurant" },
                    { 136, "Soho", "London", "UK", 0, null, 51.5136, -0.1321, "Sketch", "Restaurant" },

                    // === Cafenele din Londra ===
                    { 137, "Covent Garden", "London", "UK", 0, null, 51.5118, -0.1226, "Monmouth Coffee", "Cafe" },
                    { 138, "Shoreditch", "London", "UK", 0, null, 51.5245, -0.0789, "The Coffee House", "Cafe" },

                    // === Atracții din Brașov ===
                    { 139, "Strada Sforii", "Brașov", "Romania", 0, null, 45.6415, 25.5895, "Strada Sforii", "Attraction" },
                    { 140, "Piața Sfatului", "Brașov", "Romania", 0, null, 45.6426, 25.5887, "Black Church", "Attraction" },
                    { 141, "Râșnov", "Brașov", "Romania", 0, null, 45.6955, 25.4955, "Râșnov Fortress", "Attraction" },

                    // === Plaje ===
                    { 142, "Maldives", "Maldives", "Maldives", 0, null, 4.1755, 73.5093, "Maldives Beach", "Nature" },
                    { 143, "Bali", "Indonesia", "Indonesia", 0, null, -8.3405, 115.092, "Bali Beach", "Nature" },

                    // === Restaurante din Santorini ===
                    { 144, "Oia", "Santorini", "Greece", 0, null, 36.4618, 25.3753, "Ambrosia Restaurant", "Restaurant" },
                    { 145, "Fira", "Santorini", "Greece", 0, null, 36.4167, 25.4317, "Metaxi Mas", "Restaurant" },

                    // === Cafenele din Santorini ===
                    { 146, "Oia", "Santorini", "Greece", 0, null, 36.4618, 25.3753, "Café Oia", "Cafe" },
                    { 147, "Fira", "Santorini", "Greece", 0, null, 36.4167, 25.4317, "Café Fira", "Cafe" },

                    // === Muzee din Barcelona ===
                    { 148, "Passeig de Gràcia", "Barcelona", "Spain", 0, null, 41.3948, 2.1637, "Casa Batlló", "Museum" },
                    { 149, "Montjuïc", "Barcelona", "Spain", 0, null, 41.3637, 2.1587, "MNAC", "Museum" },

                    // === Restaurante din Bangkok ===
                    { 150, "Khao San Road", "Bangkok", "Thailand", 0, null, 13.759, 100.4974, "Khao San Road Food", "Restaurant" },
                    { 151, "Sukhumvit", "Bangkok", "Thailand", 0, null, 13.739, 100.5607, "Gaggan Anand", "Restaurant" },
                    { 152, "Chinatown", "Bangkok", "Thailand", 0, null, 13.74, 100.5093, "Jay Fai", "Restaurant" },

                    // === Cafenele din Bangkok ===
                    { 153, "Siam", "Bangkok", "Thailand", 0, null, 13.7467, 100.5342, "Siam Café", "Cafe" },
                    { 154, "Thong Lor", "Bangkok", "Thailand", 0, null, 13.7345, 100.5807, "Thong Lor Coffee", "Cafe" },

                    // === Muzee din București ===
                    { 155, "Calea Victoriei", "București", "Romania", 0, null, 44.4422, 26.0976, "National Art Museum", "Museum" },
                    { 156, "Herăstrău", "București", "Romania", 0, null, 44.4615, 26.0785, "National Village", "Museum" },

                    // === Atracții din Tokyo ===
                    { 157, "Asakusa", "Tokyo", "Japan", 0, null, 35.7148, 139.7967, "Senso-ji Temple", "Attraction" },
                    { 158, "Shibuya", "Tokyo", "Japan", 0, null, 35.6595, 139.7004, "Shibuya Crossing", "Attraction" },

                    // === Restaurante din Paris ===
                    { 159, "Le Marais", "Paris", "France", 0, null, 48.8566, 2.3522, "Breizh Café", "Restaurant" },
                    { 160, "Latin Quarter", "Paris", "France", 0, null, 48.8499, 2.3444, "Bouillon Chartier", "Restaurant" },

                    // === Cafenele din New York ===
                    { 161, "SoHo", "New York", "USA", 0, null, 40.7233, -73.9985, "Blue Bottle Coffee SoHo", "Cafe" },
                    { 162, "West Village", "New York", "USA", 0, null, 40.7358, -74.0022, "Café Grumpy", "Cafe" },

                    // === Atracții din Paris ===
                    { 163, "Montmartre", "Paris", "France", 0, null, 48.8867, 2.3431, "Sacré-Cœur", "Attraction" },
                    { 164, "Le Marais", "Paris", "France", 0, null, 48.8566, 2.3522, "Place des Vosges", "Attraction" },

                    // === Restaurante din New York ===
                    { 165, "Times Square", "New York", "USA", 0, null, 40.758, -73.9855, "Carmine's Italian", "Restaurant" },
                    { 166, "East Village", "New York", "USA", 0, null, 40.7264, -73.9818, "Joe's Pizza", "Restaurant" },

                    // === Cafenele din Barcelona ===
                    { 167, "Gothic Quarter", "Barcelona", "Spain", 0, null, 41.3825, 2.1769, "Café Royal", "Cafe" },
                    { 168, "Gràcia", "Barcelona", "Spain", 0, null, 41.4037, 2.1567, "Café Catalana", "Cafe" },

                    // === Muzee din Brașov ===
                    { 169, "Piața Sfatului", "Brașov", "Romania", 0, null, 45.6426, 25.5887, "Brașov City Museum", "Museum" },

                    // === Atracții din București ===
                    { 170, "Calea Victoriei", "București", "Romania", 0, null, 44.4422, 26.0976, "Arcul de Triumf", "Attraction" },
                    { 171, "Herăstrău", "București", "Romania", 0, null, 44.4615, 26.0785, "Palace of the Parliament", "Attraction" },

                    // === Restaurante din Brașov ===
                    { 172, "Piața Sfatului", "Brașov", "Romania", 0, null, 45.6426, 25.5887, "Hanul lui Manuc Brașov", "Restaurant" },

                    // === Atracții din Londra ===
                    { 173, "Westminster", "London", "UK", 0, null, 51.5007, -0.1246, "Big Ben", "Attraction" },
                    { 174, "Tower Hill", "London", "UK", 0, null, 51.5081, -0.0759, "Tower of London", "Attraction" },
                    { 175, "South Bank", "London", "UK", 0, null, 51.5076, -0.1156, "London Eye", "Attraction" },

                    // === Muzee din Bangkok ===
                    { 176, "Dusit", "Bangkok", "Thailand", 0, null, 13.765, 100.515, "Grand Palace", "Museum" },
                    { 177, "Wat Pho", "Bangkok", "Thailand", 0, null, 13.7517, 100.4923, "Wat Pho Temple", "Museum" },

                    // === Atracții din Santorini ===
                    { 178, "Oia", "Santorini", "Greece", 0, null, 36.4618, 25.3753, "Oia Sunset", "Attraction" },
                    { 179, "Akrotiri", "Santorini", "Greece", 0, null, 36.3983, 25.4033, "Akrotiri Ruins", "Attraction" },

                    // === Atracții din New York ===
                    { 180, "Brooklyn", "New York", "USA", 0, null, 40.6892, -73.9442, "Brooklyn Bridge", "Attraction" },
                    { 181, "Wall Street", "New York", "USA", 0, null, 40.7074, -74.0113, "Wall Street", "Attraction" },

                    // === Muzee din Santorini ===
                    { 182, "Fira", "Santorini", "Greece", 0, null, 36.4167, 25.4317, "Santorini Archaeological Museum", "Museum" },

                    // === Restaurante din Londra ===
                    { 183, "Shoreditch", "London", "UK", 0, null, 51.5245, -0.0789, "Brat", "Restaurant" },

                    // === Cafenele din București ===
                    { 184, "Herăstrău", "București", "Romania", 0, null, 44.4615, 26.0785, "Cafeneaua din Herăstrău", "Cafe" },

                    // === Atracții din Tokyo ===
                    { 185, "Akihabara", "Tokyo", "Japan", 0, null, 35.7022, 139.7744, "Electric Town", "Attraction" },

                    // === Muzee din New York ===
                    { 186, "11th Street", "New York", "USA", 0, null, 40.704, -74.0105, "Whitney Museum", "Museum" },

                    // === Cafenele din Paris ===
                    { 187, "Le Marais", "Paris", "France", 0, null, 48.8566, 2.3522, "Café Charlot", "Cafe" },

                    // === Restaurante din Bangkok ===
                    { 188, "Silom", "Bangkok", "Thailand", 0, null, 13.7245, 100.5342, "Bo.Lan", "Restaurant" },

                    // === Atracții din Brașov ===
                    { 189, "Tâmpa", "Brașov", "Romania", 0, null, 45.6385, 25.5835, "Tâmpa Mountain", "Attraction" },

                    // === Muzee din București ===
                    { 190, "Universitate", "București", "Romania", 0, null, 44.4365, 26.0985, "Romanian Athenaeum", "Museum" },

                    // === Cafenele din Tokyo ===
                    { 191, "Shinjuku", "Tokyo", "Japan", 0, null, 35.6938, 139.7034, "Starbucks Reserve Roastery", "Cafe" },

                    // === Restaurante din Paris ===
                    { 192, "Montmartre", "Paris", "France", 0, null, 48.8867, 2.3431, "Le Consulat", "Restaurant" },

                    // === Atracții din Barcelona ===
                    { 193, "Gothic Quarter", "Barcelona", "Spain", 0, null, 41.3825, 2.1769, "Barcelona Cathedral", "Attraction" },

                    // === Muzee din Londra ===
                    { 194, "King's Road", "London", "UK", 0, null, 51.4896, -0.1655, "V&A Museum", "Museum" },

                    // === Cafenele din Londra ===
                    { 195, "Camden", "London", "UK", 0, null, 51.5392, -0.1426, "Borough Market Coffee", "Cafe" },

                    // === Restaurante din București ===
                    { 196, "Dorobanți", "București", "Romania", 0, null, 44.4515, 26.0885, "La Dorna", "Restaurant" },

                    // === Atracții din Santorini ===
                    { 197, "Fira", "Santorini", "Greece", 0, null, 36.4167, 25.4317, "Fira Caldera", "Attraction" },

                    // === Muzee din Tokyo ===
                    { 198, "Odaiba", "Tokyo", "Japan", 0, null, 35.6267, 139.7736, "Miraikan", "Museum" },

                    // === Cafenele din Bangkok ===
                    { 199, "Ari", "Bangkok", "Thailand", 0, null, 13.779, 100.5442, "Ari Café", "Cafe" },

                    // === Restaurante din New York ===
                    { 200, "SoHo", "New York", "USA", 0, null, 40.7233, -73.9985, "Ivan Ramen", "Restaurant" },
                });

            // LocationTags - associating tags with locations
            migrationBuilder.InsertData(
                table: "LocationTags",
                columns: new[] { "LocationId", "TagId", "TagCount" },
                values: new object[,]
                {
                    // Muzee Paris - Culture & Art, Historical, Scenic View
                    { 101, 11, 5 }, { 101, 6, 4 }, { 101, 7, 3 },
                    { 102, 11, 5 }, { 102, 6, 3 }, { 102, 7, 2 },
                    { 103, 11, 4 }, { 103, 5, 3 }, { 103, 7, 2 },

                    // Cafenele Brașov - Food & Drinks, Hidden Gem, Quiet & Relaxing
                    { 104, 8, 4 }, { 104, 3, 3 }, { 104, 5, 2 },
                    { 105, 8, 4 }, { 105, 3, 4 }, { 105, 5, 3 },

                    // Restaurante Tokyo - Food & Drinks, Culture & Art, Hidden Gem
                    { 106, 8, 5 }, { 106, 11, 3 }, { 106, 3, 2 },
                    { 107, 8, 5 }, { 107, 10, 3 }, { 107, 11, 2 },
                    { 108, 8, 5 }, { 108, 1, 3 }, { 108, 11, 2 },

                    // Muzee Londra - Culture & Art, Historical, Family-Friendly
                    { 109, 11, 5 }, { 109, 6, 4 }, { 109, 4, 3 },
                    { 110, 11, 5 }, { 110, 6, 2 }, { 110, 7, 3 },
                    { 111, 11, 4 }, { 111, 4, 5 }, { 111, 6, 3 },

                    // Cafenele București - Food & Drinks, Hidden Gem, Quiet & Relaxing
                    { 112, 8, 4 }, { 112, 3, 3 }, { 112, 5, 2 },
                    { 113, 8, 4 }, { 113, 1, 3 }, { 113, 3, 2 },

                    // Restaurante Barcelona - Food & Drinks, Romantic, Culture & Art
                    { 114, 8, 5 }, { 114, 2, 3 }, { 114, 11, 2 },
                    { 115, 8, 5 }, { 115, 2, 4 }, { 115, 11, 3 },
                    { 116, 8, 5 }, { 116, 9, 3 }, { 116, 2, 2 },

                    // Muzee New York - Culture & Art, Historical, Scenic View
                    { 117, 11, 5 }, { 117, 6, 4 }, { 117, 7, 3 },
                    { 118, 11, 5 }, { 118, 6, 3 }, { 118, 7, 2 },
                    { 119, 11, 5 }, { 119, 6, 2 }, { 119, 7, 3 },

                    // Cafenele Tokyo - Food & Drinks, Hidden Gem, Quiet & Relaxing
                    { 120, 8, 4 }, { 120, 3, 3 }, { 120, 5, 2 },
                    { 121, 8, 4 }, { 121, 2, 3 }, { 121, 5, 2 },

                    // Parcuri - Nature & Beach, Quiet & Relaxing, Scenic View
                    { 122, 9, 4 }, { 122, 5, 3 }, { 122, 7, 2 },
                    { 123, 9, 5 }, { 123, 5, 4 }, { 123, 7, 3 },
                    { 124, 9, 4 }, { 124, 5, 3 }, { 124, 7, 2 },

                    // Atracții - Historical, Scenic View, Culture & Art
                    { 125, 6, 5 }, { 125, 7, 3 }, { 125, 11, 4 },
                    { 126, 2, 4 }, { 126, 7, 5 }, { 126, 11, 3 },
                    { 127, 7, 4 }, { 127, 8, 3 }, { 127, 11, 2 },
                    { 128, 7, 5 }, { 128, 2, 3 }, { 128, 1, 2 },

                    // Restaurante București - Food & Drinks, Romantic, Hidden Gem
                    { 129, 8, 5 }, { 129, 2, 3 }, { 129, 3, 2 },
                    { 130, 8, 5 }, { 130, 6, 3 }, { 130, 11, 2 },

                    // Cafenele Paris - Food & Drinks, Romantic, Culture & Art
                    { 131, 8, 5 }, { 131, 2, 4 }, { 131, 11, 3 },
                    { 132, 8, 5 }, { 132, 2, 4 }, { 132, 11, 3 },

                    // Muzee Tokyo - Culture & Art, Historical, Family-Friendly
                    { 133, 11, 5 }, { 133, 6, 4 }, { 133, 4, 3 },
                    { 134, 11, 5 }, { 134, 3, 3 }, { 134, 4, 2 },

                    // Restaurante Londra - Food & Drinks, Romantic, Hidden Gem
                    { 135, 8, 5 }, { 135, 2, 3 }, { 135, 3, 2 },
                    { 136, 8, 5 }, { 136, 2, 4 }, { 136, 11, 3 },

                    // Cafenele Londra - Food & Drinks, Hidden Gem, Quiet & Relaxing
                    { 137, 8, 4 }, { 137, 3, 3 }, { 137, 5, 2 },
                    { 138, 8, 4 }, { 138, 3, 4 }, { 138, 5, 3 },

                    // Atracții Brașov - Historical, Scenic View, Adventure
                    { 139, 6, 4 }, { 139, 7, 3 }, { 139, 12, 2 },
                    { 140, 6, 5 }, { 140, 7, 3 }, { 140, 11, 4 },
                    { 141, 6, 5 }, { 141, 7, 4 }, { 141, 12, 3 },

                    // Plaje - Nature & Beach, Romantic, Scenic View
                    { 142, 9, 5 }, { 142, 2, 4 }, { 142, 7, 5 },
                    { 143, 9, 5 }, { 143, 2, 3 }, { 143, 7, 4 },

                    // Restaurante Santorini - Food & Drinks, Romantic, Scenic View
                    { 144, 8, 5 }, { 144, 2, 5 }, { 144, 7, 4 },
                    { 145, 8, 5 }, { 145, 2, 4 }, { 145, 7, 3 },

                    // Cafenele Santorini - Food & Drinks, Romantic, Quiet & Relaxing
                    { 146, 8, 4 }, { 146, 2, 4 }, { 146, 5, 3 },
                    { 147, 8, 4 }, { 147, 2, 3 }, { 147, 5, 2 },

                    // Muzee Barcelona - Culture & Art, Historical, Scenic View
                    { 148, 11, 5 }, { 148, 6, 4 }, { 148, 7, 3 },
                    { 149, 11, 5 }, { 149, 6, 3 }, { 149, 7, 2 },

                    // Restaurante Bangkok - Food & Drinks, Budget-Friendly, Nightlife
                    { 150, 8, 5 }, { 150, 10, 4 }, { 150, 1, 3 },
                    { 151, 8, 5 }, { 151, 3, 3 }, { 151, 11, 2 },
                    { 152, 8, 5 }, { 152, 10, 3 }, { 152, 11, 2 },

                    // Cafenele Bangkok - Food & Drinks, Hidden Gem, Budget-Friendly
                    { 153, 8, 4 }, { 153, 3, 3 }, { 153, 10, 2 },
                    { 154, 8, 4 }, { 154, 3, 4 }, { 154, 10, 2 },

                    // Muzee București - Culture & Art, Historical
                    { 155, 11, 5 }, { 155, 6, 4 }, { 155, 7, 2 },
                    { 156, 11, 4 }, { 156, 6, 3 }, { 156, 9, 2 },

                    // Atracții Tokyo - Culture & Art, Historical, Adventure
                    { 157, 11, 5 }, { 157, 6, 4 }, { 157, 12, 2 },
                    { 158, 1, 4 }, { 158, 11, 3 }, { 158, 12, 2 },

                    // Restaurante Paris - Food & Drinks, Romantic, Culture & Art
                    { 159, 8, 5 }, { 159, 2, 4 }, { 159, 11, 3 },
                    { 160, 8, 5 }, { 160, 10, 3 }, { 160, 11, 2 },

                    // Cafenele New York - Food & Drinks, Hidden Gem, Quiet & Relaxing
                    { 161, 8, 4 }, { 161, 3, 3 }, { 161, 5, 2 },
                    { 162, 8, 4 }, { 162, 3, 4 }, { 162, 5, 3 },

                    // Atracții Paris - Historical, Romantic, Scenic View
                    { 163, 6, 5 }, { 163, 2, 4 }, { 163, 7, 3 },
                    { 164, 6, 4 }, { 164, 2, 3 }, { 164, 7, 2 },

                    // Restaurante New York - Food & Drinks, Nightlife, Culture & Art
                    { 165, 8, 5 }, { 165, 1, 3 }, { 165, 11, 2 },
                    { 166, 8, 5 }, { 166, 10, 3 }, { 166, 1, 2 },

                    // Cafenele Barcelona - Food & Drinks, Hidden Gem, Culture & Art
                    { 167, 8, 4 }, { 167, 3, 3 }, { 167, 11, 2 },
                    { 168, 8, 4 }, { 168, 3, 4 }, { 168, 11, 2 },

                    // Muzee Brașov - Culture & Art, Historical
                    { 169, 11, 5 }, { 169, 6, 4 }, { 169, 7, 2 },

                    // Atracții București - Historical, Culture & Art, Scenic View
                    { 170, 6, 5 }, { 170, 11, 3 }, { 170, 7, 2 },
                    { 171, 6, 5 }, { 171, 11, 4 }, { 171, 7, 3 },

                    // Restaurante Brașov - Food & Drinks, Hidden Gem, Historical
                    { 172, 8, 5 }, { 172, 3, 3 }, { 172, 6, 2 },

                    // Atracții Londra - Historical, Scenic View, Culture & Art
                    { 173, 6, 5 }, { 173, 7, 4 }, { 173, 11, 3 },
                    { 174, 6, 5 }, { 174, 7, 3 }, { 174, 11, 4 },
                    { 175, 7, 5 }, { 175, 2, 3 }, { 175, 11, 2 },

                    // Muzee Bangkok - Culture & Art, Historical, Budget-Friendly
                    { 176, 11, 5 }, { 176, 6, 4 }, { 176, 10, 2 },
                    { 177, 11, 5 }, { 177, 6, 4 }, { 177, 10, 2 },

                    // Atracții Santorini - Romantic, Scenic View, Nature & Beach
                    { 178, 2, 5 }, { 178, 7, 5 }, { 178, 9, 3 },
                    { 179, 6, 5 }, { 179, 7, 4 }, { 179, 12, 2 },

                    // Atracții New York - Historical, Culture & Art, Nightlife
                    { 180, 6, 4 }, { 180, 11, 3 }, { 180, 1, 2 },
                    { 181, 6, 5 }, { 181, 11, 3 }, { 181, 1, 2 },

                    // Muzee Santorini - Culture & Art, Historical
                    { 182, 11, 5 }, { 182, 6, 4 }, { 182, 7, 2 },

                    // Restaurante Londra - Food & Drinks, Hidden Gem, Culture & Art
                    { 183, 8, 5 }, { 183, 3, 3 }, { 183, 11, 2 },

                    // Cafenele București - Food & Drinks, Quiet & Relaxing
                    { 184, 8, 4 }, { 184, 5, 3 }, { 184, 3, 2 },

                    // Atracții Tokyo - Nightlife, Culture & Art, Adventure
                    { 185, 1, 4 }, { 185, 11, 3 }, { 185, 12, 2 },

                    // Muzee New York - Culture & Art, Historical
                    { 186, 11, 5 }, { 186, 6, 3 }, { 186, 7, 2 },

                    // Cafenele Paris - Food & Drinks, Hidden Gem, Culture & Art
                    { 187, 8, 4 }, { 187, 3, 3 }, { 187, 11, 2 },

                    // Restaurante Bangkok - Food & Drinks, Hidden Gem, Culture & Art
                    { 188, 8, 5 }, { 188, 3, 3 }, { 188, 11, 2 },

                    // Atracții Brașov - Nature & Beach, Adventure, Scenic View
                    { 189, 9, 4 }, { 189, 12, 5 }, { 189, 7, 3 },

                    // Muzee București - Culture & Art, Historical
                    { 190, 11, 5 }, { 190, 6, 4 }, { 190, 7, 2 },

                    // Cafenele Tokyo - Food & Drinks, Hidden Gem
                    { 191, 8, 4 }, { 191, 3, 3 }, { 191, 5, 2 },

                    // Restaurante Paris - Food & Drinks, Romantic, Culture & Art
                    { 192, 8, 5 }, { 192, 2, 4 }, { 192, 11, 3 },

                    // Atracții Barcelona - Historical, Culture & Art, Scenic View
                    { 193, 6, 5 }, { 193, 11, 4 }, { 193, 7, 3 },

                    // Muzee Londra - Culture & Art, Historical
                    { 194, 11, 5 }, { 194, 6, 4 }, { 194, 7, 2 },

                    // Cafenele Londra - Food & Drinks, Hidden Gem
                    { 195, 8, 4 }, { 195, 3, 3 }, { 195, 5, 2 },

                    // Restaurante București - Food & Drinks, Romantic
                    { 196, 8, 5 }, { 196, 2, 3 }, { 196, 3, 2 },

                    // Atracții Santorini - Romantic, Scenic View
                    { 197, 2, 5 }, { 197, 7, 5 }, { 197, 9, 3 },

                    // Muzee Tokyo - Culture & Art, Family-Friendly
                    { 198, 11, 5 }, { 198, 4, 3 }, { 198, 7, 2 },

                    // Cafenele Bangkok - Food & Drinks, Hidden Gem
                    { 199, 8, 4 }, { 199, 3, 3 }, { 199, 10, 2 },

                    // Restaurante New York - Food & Drinks, Hidden Gem
                    { 200, 8, 5 }, { 200, 3, 3 }, { 200, 10, 2 },
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Locations",
                keyColumn: "Id",
                keyValues: new object[] { 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200 });
        }
    }
}
