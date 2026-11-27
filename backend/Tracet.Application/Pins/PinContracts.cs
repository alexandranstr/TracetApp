using Tracet.Application.Common;
using Tracet.Domain.Enums;

namespace Tracet.Application.Pins;

public sealed record LocationInput(
    double Latitude,
    double Longitude,
    string? CityName,
    string? CountryName,
    string? Address,
    string? PlaceName,
    string? Category,
    EntityType EntityType,
    string? GooglePlaceId);

public sealed record CreatePinRequest(
    string? Title,
    string? JournalEntry,
    string? Category,
    int? Rating,
    bool IsPrivate,
    DateTime VisitedAt,
    LocationInput? Location,
    string? PhotoUrlsJson,
    string? TagsVectorJson);

public sealed record UpdatePinRequest(
    string? Title,
    string? JournalEntry,
    string? Category,
    int? Rating,
    bool? IsPrivate,
    string? PhotoUrlsJson);

public sealed record BoundingBox(
    double SouthWestLatitude,
    double SouthWestLongitude,
    double NorthEastLatitude,
    double NorthEastLongitude);

public sealed record LocationResponse(
    int Id,
    double Latitude,
    double Longitude,
    string CityName,
    string CountryName,
    string? Address,
    string? PlaceName,
    string? Category,
    int EntityType,
    string? GooglePlaceId);

public sealed record PinResponse(
    int Id,
    string Title,
    string JournalEntry,
    string Category,
    int? Rating,
    bool IsPrivate,
    DateTime VisitedAt,
    DateTime CreatedAt,
    string UserId,
    string? UserName,
    string? UserPhotoUrl,
    int LocationId,
    LocationResponse Location,
    string PhotoUrlsJson,
    string TagsVectorJson);

public sealed record PinsPage(IReadOnlyList<PinResponse> Pins, Pagination Pagination);
