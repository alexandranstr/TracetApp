using System.ComponentModel.DataAnnotations;
using Tracet.models;

namespace Tracet.DTOs;

public class CreatePinDto
{
    [Required]
    [StringLength(200, ErrorMessage = "Title cannot exceed 200 characters.")]
    public string Title { get; set; } = string.Empty;

    [StringLength(5000, ErrorMessage = "Journal entry cannot exceed 5000 characters.")]
    public string JournalEntry { get; set; } = string.Empty;

    [Required]
    [StringLength(50, ErrorMessage = "Category cannot exceed 50 characters.")]
    public string Category { get; set; } = "General";

    [Range(1, 5, ErrorMessage = "Rating must be between 1 and 5.")]
    public int? Rating { get; set; }

    public bool IsPrivate { get; set; }

    [Required]
    public DateTime VisitedAt { get; set; }

    [Required]
    public CreateLocationDto Location { get; set; } = null!;

    [StringLength(10000, ErrorMessage = "Photo URLs JSON cannot exceed 10000 characters.")]
    public string PhotoUrlsJson { get; set; } = "[]";

    [StringLength(5000, ErrorMessage = "Tags JSON cannot exceed 5000 characters.")]
    public string TagsVectorJson { get; set; } = "[]";
}

public class CreateLocationDto
{
    [Required]
    [Range(-90, 90, ErrorMessage = "Latitude must be between -90 and 90.")]
    public double Latitude { get; set; }

    [Required]
    [Range(-180, 180, ErrorMessage = "Longitude must be between -180 and 180.")]
    public double Longitude { get; set; }

    [StringLength(100, ErrorMessage = "City name cannot exceed 100 characters.")]
    public string CityName { get; set; } = string.Empty;

    [StringLength(100, ErrorMessage = "Country name cannot exceed 100 characters.")]
    public string CountryName { get; set; } = string.Empty;

    [StringLength(300, ErrorMessage = "Address cannot exceed 300 characters.")]
    public string? Address { get; set; }

    [StringLength(200, ErrorMessage = "Place name cannot exceed 200 characters.")]
    public string? PlaceName { get; set; }

    [StringLength(50, ErrorMessage = "Category cannot exceed 50 characters.")]
    public string? Category { get; set; }

    public EntityType EntityType { get; set; } = EntityType.POI;

    [StringLength(200, ErrorMessage = "Google Place ID cannot exceed 200 characters.")]
    public string? GooglePlaceId { get; set; }
}

public class PinResponseDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string JournalEntry { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public int? Rating { get; set; }
    public bool IsPrivate { get; set; }
    public DateTime VisitedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public string UserId { get; set; } = string.Empty;

    public string PhotoUrlsJson { get; set; } = "[]";
    public string TagsVectorJson { get; set; } = "[]";
    public LocationResponseDto Location { get; set; } = null!;
}

public class LocationResponseDto
{
    public int Id { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string CityName { get; set; } = string.Empty;
    public string CountryName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? PlaceName { get; set; }
    public string? Category { get; set; }
    public int EntityType { get; set; }
    public string? GooglePlaceId { get; set; }
}

public class UpdatePinDto
{
    [StringLength(200, ErrorMessage = "Title cannot exceed 200 characters.")]
    public string? Title { get; set; }

    [StringLength(5000, ErrorMessage = "Journal entry cannot exceed 5000 characters.")]
    public string? JournalEntry { get; set; }

    [StringLength(50, ErrorMessage = "Category cannot exceed 50 characters.")]
    public string? Category { get; set; }

    [Range(1, 5, ErrorMessage = "Rating must be between 1 and 5.")]
    public int? Rating { get; set; }

    public bool? IsPrivate { get; set; }

    [StringLength(10000, ErrorMessage = "Photo URLs JSON cannot exceed 10000 characters.")]
    public string? PhotoUrlsJson { get; set; }
}