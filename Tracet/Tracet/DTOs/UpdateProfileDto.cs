using System.ComponentModel.DataAnnotations;

namespace Tracet.DTOs;

public class UpdateProfileDto
{
    [StringLength(100, ErrorMessage = "Display name cannot exceed 100 characters.")]
    public string? DisplayName { get; set; }

    [StringLength(50, ErrorMessage = "Username cannot exceed 50 characters.")]
    [RegularExpression("^[a-zA-Z0-9_]+$", ErrorMessage = "Username can only contain letters, numbers, and underscores.")]
    public string? Username { get; set; }

    [StringLength(100, ErrorMessage = "Home country cannot exceed 100 characters.")]
    public string? HomeCountry { get; set; }

    [Url(ErrorMessage = "Photo URL must be a valid URL.")]
    public string? PhotoUrl { get; set; }

    [Phone(ErrorMessage = "Phone number must be a valid phone number.")]
    [StringLength(20, ErrorMessage = "Phone number cannot exceed 20 characters.")]
    public string? PhoneNumber { get; set; }
}