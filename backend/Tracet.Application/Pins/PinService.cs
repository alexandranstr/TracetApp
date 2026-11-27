using Microsoft.EntityFrameworkCore;
using Tracet.Application.Abstractions;
using Tracet.Application.Tags;
using Tracet.Application.Common;
using Tracet.Application.Pins.Statistics;
using Tracet.Application.Social;
using Tracet.Domain.Constants;
using Tracet.Domain.Entities;

namespace Tracet.Application.Pins;

public sealed class PinService(IAppDbContext db, ISocialGraph socialGraph, IPinStatisticsService statistics) : IPinService
{
    private const double SamePlaceTolerance = 0.0001;

    public async Task<IReadOnlyList<PinResponse>> GetNearbyAsync(
        string userId, BoundingBox area, CancellationToken cancellationToken = default)
    {
        var audience = await AudienceAsync(userId, cancellationToken);
        var pins = await PinsWithDetails()
            .Where(PinQueries.VisibleTo(audience))
            .Where(PinQueries.Within(area))
            .OrderByDescending(p => p.VisitedAt)
            .ToListAsync(cancellationToken);
        return pins.Select(p => p.ToResponse()).ToList();
    }

    public async Task<PinsPage> GetVisibleAsync(string userId, PageRequest page, CancellationToken cancellationToken = default)
    {
        var audience = await AudienceAsync(userId, cancellationToken);
        return await ToPageAsync(
            PinsWithDetails().Where(PinQueries.VisibleTo(audience)).OrderByDescending(p => p.VisitedAt),
            page, cancellationToken);
    }

    public async Task<PinsPage> GetSharedHistoryAsync(string userId, PageRequest page, CancellationToken cancellationToken = default)
    {
        var audience = await AudienceAsync(userId, cancellationToken);
        return await ToPageAsync(
            PinsWithDetails().Where(PinQueries.SharedWith(audience)).OrderByDescending(p => p.CreatedAt),
            page, cancellationToken);
    }

    public Task<PinsPage> GetMineAsync(string userId, PageRequest page, CancellationToken cancellationToken = default) =>
        ToPageAsync(
            PinsWithDetails().Where(p => p.UserId == userId).OrderByDescending(p => p.CreatedAt),
            page, cancellationToken);

    public async Task<Result<PinResponse>> CreateAsync(
        string userId, CreatePinRequest request, CancellationToken cancellationToken = default)
    {
        if (PinRules.ValidateCreate(request) is { } error)
            return error;

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
            return Error.NotFound("User not found.");

        var category = string.IsNullOrEmpty(request.Category) ? PinCategories.Default : request.Category;
        var location = await FindOrAddLocationAsync(request.Location!, request.Location!.Category ?? request.Category, cancellationToken);
        var tagIds = await CountTagsAsync(location, TagVector.Parse(request.TagsVectorJson), cancellationToken);

        var pin = db.Pins.Add(new Pin
        {
            Title = request.Title!.Trim(),
            JournalEntry = request.JournalEntry ?? string.Empty,
            Category = category,
            Rating = request.Rating,
            IsPrivate = request.IsPrivate,
            VisitedAt = request.VisitedAt,
            CreatedAt = DateTime.UtcNow,
            User = user,
            Location = location,
            PhotoUrlsJson = request.PhotoUrlsJson ?? "[]",
            TagsVectorJson = TagVector.Serialize(tagIds)
        }).Entity;

        await db.SaveChangesAsync(cancellationToken);
        statistics.Invalidate(userId);
        return pin.ToResponse();
    }

    public async Task<Result<PinResponse>> UpdateAsync(
        string userId, int pinId, UpdatePinRequest request, CancellationToken cancellationToken = default)
    {
        if (PinRules.ValidateUpdate(request) is { } error)
            return error;

        var owned = await FindOwnedPinAsync(userId, pinId, cancellationToken);
        if (!owned.IsSuccess)
            return owned.Error!;

        var pin = owned.Value;
        pin.Title = request.Title?.Trim() ?? pin.Title;
        pin.JournalEntry = request.JournalEntry ?? pin.JournalEntry;
        pin.Category = string.IsNullOrEmpty(request.Category) ? pin.Category : request.Category;
        pin.Rating = request.Rating ?? pin.Rating;
        pin.IsPrivate = request.IsPrivate ?? pin.IsPrivate;
        pin.PhotoUrlsJson = request.PhotoUrlsJson ?? pin.PhotoUrlsJson;

        await db.SaveChangesAsync(cancellationToken);
        statistics.Invalidate(userId);
        return pin.ToResponse();
    }

    public async Task<Result<PinResponse>> ToggleVisibilityAsync(
        string userId, int pinId, CancellationToken cancellationToken = default)
    {
        var owned = await FindOwnedPinAsync(userId, pinId, cancellationToken);
        if (!owned.IsSuccess)
            return owned.Error!;

        owned.Value.IsPrivate = !owned.Value.IsPrivate;
        await db.SaveChangesAsync(cancellationToken);
        return owned.Value.ToResponse();
    }

    public async Task<Result> DeleteAsync(string userId, int pinId, CancellationToken cancellationToken = default)
    {
        var owned = await FindOwnedPinAsync(userId, pinId, cancellationToken);
        if (!owned.IsSuccess)
            return owned.Error!;

        db.Pins.Remove(owned.Value);
        await db.SaveChangesAsync(cancellationToken);
        statistics.Invalidate(userId);
        return Result.Success();
    }

    private IQueryable<Pin> PinsWithDetails() =>
        db.Pins.Include(p => p.Location).Include(p => p.User);

    private async Task<PinAudience> AudienceAsync(string userId, CancellationToken cancellationToken) =>
        new(userId,
            await socialGraph.GetFriendIdsAsync(userId, cancellationToken),
            (await socialGraph.GetBlockRelationsAsync(userId, cancellationToken)).All);

    private static async Task<PinsPage> ToPageAsync(
        IQueryable<Pin> query, PageRequest page, CancellationToken cancellationToken)
    {
        var (pins, pagination) = await query.ToPageAsync(page, cancellationToken);
        return new PinsPage(pins.Select(p => p.ToResponse()).ToList(), pagination);
    }

    private async Task<Result<Pin>> FindOwnedPinAsync(string userId, int pinId, CancellationToken cancellationToken)
    {
        var pin = await PinsWithDetails().FirstOrDefaultAsync(p => p.Id == pinId, cancellationToken);
        if (pin is null)
            return Error.NotFound("Pin not found.");
        if (pin.UserId != userId)
            return Error.Forbidden("You can only change your own pins.");
        return pin;
    }

    private async Task<Location> FindOrAddLocationAsync(
        LocationInput input, string? category, CancellationToken cancellationToken)
    {
        var location = string.IsNullOrEmpty(input.GooglePlaceId)
            ? null
            : await db.Locations.FirstOrDefaultAsync(l => l.GooglePlaceId == input.GooglePlaceId, cancellationToken);

        location ??= await db.Locations.FirstOrDefaultAsync(
            l => Math.Abs(l.Latitude - input.Latitude) < SamePlaceTolerance &&
                 Math.Abs(l.Longitude - input.Longitude) < SamePlaceTolerance,
            cancellationToken);

        location ??= db.Locations.Add(new Location
        {
            Latitude = input.Latitude,
            Longitude = input.Longitude,
            CityName = input.CityName ?? string.Empty,
            CountryName = input.CountryName ?? string.Empty,
            Address = input.Address,
            PlaceName = input.PlaceName,
            EntityType = input.EntityType,
            GooglePlaceId = input.GooglePlaceId
        }).Entity;

        if (string.IsNullOrEmpty(location.Category) && PinCategories.IsValid(category))
            location.Category = category;

        return location;
    }

    private async Task<IReadOnlyList<int>> CountTagsAsync(
        Location location, IReadOnlyList<int> requestedTagIds, CancellationToken cancellationToken)
    {
        if (requestedTagIds.Count == 0) return [];

        var tagIds = await db.Tags
            .Where(t => requestedTagIds.Contains(t.Id))
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);

        var existing = location.Id == 0
            ? new Dictionary<int, LocationTag>()
            : await db.LocationTags
                .Where(lt => lt.LocationId == location.Id && tagIds.Contains(lt.TagId))
                .ToDictionaryAsync(lt => lt.TagId, cancellationToken);

        foreach (var tagId in tagIds)
        {
            if (existing.TryGetValue(tagId, out var locationTag))
                locationTag.TagCount++;
            else
                db.LocationTags.Add(new LocationTag { Location = location, TagId = tagId, TagCount = 1 });
        }

        return tagIds;
    }
}
