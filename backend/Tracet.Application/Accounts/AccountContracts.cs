using System.ComponentModel.DataAnnotations;
using Tracet.Domain.Entities;

namespace Tracet.Application.Accounts;

public sealed record UpdateProfileRequest(
    [StringLength(100, ErrorMessage = "Display name cannot exceed 100 characters.")] string? DisplayName,
    [RegularExpression("^[a-zA-Z0-9_]+$", ErrorMessage = "Username can only contain letters, numbers, and underscores.")] string? Username,
    [StringLength(100, ErrorMessage = "Home country cannot exceed 100 characters.")] string? HomeCountry,
    [Url(ErrorMessage = "Photo URL must be a valid URL.")] string? PhotoUrl,
    [Phone(ErrorMessage = "Phone number must be a valid phone number."), StringLength(20, ErrorMessage = "Phone number cannot exceed 20 characters.")] string? PhoneNumber);

public sealed record ToggleTwoFactorRequest(bool Enable);

public sealed record TwoFactorStatus(bool IsTwoFactorEnabled);

public sealed record ResolvedEmail(string Email);

public sealed record UserProfile(
    string Id,
    string Email,
    string DisplayName,
    string Username,
    string? PhotoUrl,
    string? HomeCountry,
    string? PhoneNumber,
    bool IsTwoFactorEnabled,
    bool IsPhoneVerified,
    bool IsPrivateProfile,
    DateTime CreatedAt)
{
    public static UserProfile From(User user) => new(
        user.Id,
        user.Email,
        user.DisplayName,
        user.Username,
        user.PhotoUrl,
        user.HomeCountry,
        user.PhoneNumber,
        user.IsTwoFactorEnabled,
        user.IsPhoneVerified,
        user.IsPrivateProfile,
        user.CreatedAt);
}
