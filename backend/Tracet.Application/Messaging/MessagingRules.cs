using Tracet.Application.Common;

namespace Tracet.Application.Messaging;

public static class MessagingRules
{
    public const int MaxTextLength = 4000;
    public const int MaxThemeLength = 50;
    public const string DefaultTheme = "default";
    public const string DefaultMessageColor = "#FF2D55";
    public const string ImageFallbackText = "Photo";
    private const string AllowedImageHost = "https://firebasestorage.googleapis.com/";

    public static Error? ValidateText(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return Error.Validation("Message text cannot be empty.");
        if (text.Trim().Length > MaxTextLength)
            return Error.Validation($"Message is too long. Maximum {MaxTextLength} characters.");
        return null;
    }

    public static Error? ValidateImage(string? imageUrl, string? caption)
    {
        if (string.IsNullOrWhiteSpace(imageUrl) || !imageUrl.StartsWith(AllowedImageHost, StringComparison.Ordinal))
            return Error.Validation("Image must be uploaded to Tracet storage first.");
        return caption?.Trim().Length > MaxTextLength
            ? Error.Validation($"Message is too long. Maximum {MaxTextLength} characters.")
            : null;
    }

    public static Error? ValidateTheme(string? theme, string? messageColor)
    {
        if (theme?.Length > MaxThemeLength)
            return Error.Validation("Theme name is too long.");
        if (messageColor is not null && !IsHexColor(messageColor))
            return Error.Validation("Message color must be a hex color like #FF2D55.");
        return null;
    }

    private static bool IsHexColor(string value) =>
        value is ['#', .. var digits] && digits.Length == 6 && digits.All(char.IsAsciiHexDigit);
}
