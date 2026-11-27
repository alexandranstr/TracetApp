using Tracet.Domain.Entities;

namespace Tracet.Application.Pins;

public static class PinMapping
{
    public static PinResponse ToResponse(this Pin pin) => new(
        pin.Id,
        pin.Title,
        pin.JournalEntry,
        pin.Category,
        pin.Rating,
        pin.IsPrivate,
        pin.VisitedAt,
        pin.CreatedAt,
        pin.UserId,
        pin.User?.Username,
        pin.User?.PhotoUrl,
        pin.LocationId,
        pin.Location.ToResponse(),
        pin.PhotoUrlsJson,
        pin.TagsVectorJson);

    public static LocationResponse ToResponse(this Location location) => new(
        location.Id,
        location.Latitude,
        location.Longitude,
        location.CityName,
        location.CountryName,
        location.Address,
        location.PlaceName,
        location.Category,
        (int)location.EntityType,
        location.GooglePlaceId);
}
