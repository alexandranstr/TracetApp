using Tracet.Application.Common;
using Tracet.Domain.Constants;

namespace Tracet.Application.Pins;

public static class PinRules
{
    public const int MaxTitleLength = 200;
    public const int MaxJournalLength = 5000;

    public static Error? ValidateCreate(CreatePinRequest request)
    {
        if (request.Location is null)
            return Error.Validation("Invalid pin or location data.");
        if (string.IsNullOrWhiteSpace(request.Title))
            return Error.Validation("Title is required.");
        if (request.Location.Latitude is < -90 or > 90)
            return Error.Validation("Invalid latitude. Must be between -90 and 90.");
        if (request.Location.Longitude is < -180 or > 180)
            return Error.Validation("Invalid longitude. Must be between -180 and 180.");

        return ValidateContent(request.Title, request.JournalEntry, request.Category, request.Rating);
    }

    public static Error? ValidateUpdate(UpdatePinRequest request)
    {
        if (request.Title is not null && string.IsNullOrWhiteSpace(request.Title))
            return Error.Validation("Title is required.");

        return ValidateContent(request.Title, request.JournalEntry, request.Category, request.Rating);
    }

    private static Error? ValidateContent(string? title, string? journalEntry, string? category, int? rating)
    {
        if (title?.Length > MaxTitleLength)
            return Error.Validation($"Title is too long. Maximum {MaxTitleLength} characters.");
        if (journalEntry?.Length > MaxJournalLength)
            return Error.Validation($"Journal entry is too long. Maximum {MaxJournalLength} characters.");
        if (rating is < 1 or > 5)
            return Error.Validation("Rating must be between 1 and 5.");
        if (!string.IsNullOrEmpty(category) && !PinCategories.IsValid(category))
            return Error.Validation($"Invalid category. Must be one of: {string.Join(", ", PinCategories.All)}");

        return null;
    }
}
