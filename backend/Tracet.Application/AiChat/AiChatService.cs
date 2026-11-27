using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Tracet.Application.Abstractions;
using Tracet.Application.Common;
using Tracet.Domain.Constants;
using Tracet.Domain.Entities;

namespace Tracet.Application.AiChat;

public interface IAiChatService
{
    Task<Result<AiChatReply>> ChatAsync(string userId, AiChatRequest request, CancellationToken cancellationToken = default);

    Task<AiHistoryPage> GetHistoryAsync(string userId, string? provider, PageRequest page, CancellationToken cancellationToken = default);
}

public sealed class AiChatService(IAppDbContext db, IEnumerable<IAiModel> models) : IAiChatService
{
    private const int RecentPinsConsidered = 15;
    private const int PlacesPerDestination = 15;
    private const int TagsPerSavedPlace = 5;
    private const int TagsPerDestinationPlace = 3;

    public async Task<Result<AiChatReply>> ChatAsync(string userId, AiChatRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            return Error.Validation("Message cannot be empty.");

        var message = AiChatRules.Truncate(request.Message);
        if (AiChatRules.LooksLikeManipulation(message))
            return Error.Validation("Your message contains patterns that are not allowed. Please rephrase your question.");

        var provider = AiChatRules.Provider(request.Provider);
        var question = new AIChatHistory
        {
            UserId = userId,
            Role = AiRoles.User,
            Content = message,
            Timestamp = DateTime.UtcNow,
            Provider = provider
        };

        var prompt = new AiPrompt(
            TravelPromptBuilder.Build(provider, await TravelContextAsync(userId, message, cancellationToken)),
            await ConversationAsync(userId, provider, question, cancellationToken));

        string answer;
        try
        {
            answer = await models.Single(m => m.Provider == provider).GenerateAsync(prompt, cancellationToken);
        }
        catch (AiUnavailableException) when (provider == AiProviders.Gemini)
        {
            return new AiChatReply(AiChatRules.GeminiUnavailableReply, true);
        }
        catch (AiUnavailableException)
        {
            answer = AiChatRules.TraceyUnavailableReply;
        }

        db.AIChatHistories.Add(question);
        db.AIChatHistories.Add(new AIChatHistory
        {
            UserId = userId,
            Role = AiRoles.Assistant,
            Content = answer,
            Timestamp = DateTime.UtcNow,
            Provider = provider
        });
        await db.SaveChangesAsync(cancellationToken);
        return new AiChatReply(answer, false);
    }

    public async Task<AiHistoryPage> GetHistoryAsync(
        string userId, string? provider, PageRequest page, CancellationToken cancellationToken = default)
    {
        var (entries, pagination) = await db.AIChatHistories
            .Where(ForProvider(userId, provider))
            .OrderBy(h => h.Timestamp)
            .ToPageAsync(page, cancellationToken);

        var messages = entries
            .Select(h => new AiHistoryMessage(h.Id.ToString(), h.Role, h.Content, h.Timestamp, h.Provider ?? AiProviders.Gemini))
            .ToList();
        return new AiHistoryPage(messages, pagination);
    }

    private static Expression<Func<AIChatHistory, bool>> ForProvider(string userId, string? provider) => provider switch
    {
        AiProviders.Gemini => h => h.UserId == userId && (h.Provider == AiProviders.Gemini || h.Provider == null),
        AiProviders.Tracey => h => h.UserId == userId && h.Provider == AiProviders.Tracey,
        _ => h => h.UserId == userId
    };

    private async Task<IReadOnlyList<AiTurn>> ConversationAsync(
        string userId, string provider, AIChatHistory question, CancellationToken cancellationToken)
    {
        var recent = await db.AIChatHistories
            .Where(ForProvider(userId, provider))
            .OrderByDescending(h => h.Timestamp)
            .Take(AiChatRules.MaxContextMessages - 1)
            .ToListAsync(cancellationToken);

        return recent
            .AsEnumerable()
            .Reverse()
            .Append(question)
            .Select(h => new AiTurn(h.Role == AiRoles.User, h.Content))
            .ToList();
    }

    private async Task<TravelContext> TravelContextAsync(string userId, string message, CancellationToken cancellationToken)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        var pins = await db.Pins
            .Include(p => p.Location).ThenInclude(l => l.LocationTags).ThenInclude(lt => lt.Tag)
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.VisitedAt)
            .Take(RecentPinsConsidered)
            .ToListAsync(cancellationToken);

        var savedPlaces = pins
            .Select(p => new SavedPlace(p, TagNames(p.Location, TagsPerSavedPlace)))
            .ToList();
        var interests = pins
            .SelectMany(p => TagNames(p.Location, int.MaxValue))
            .Distinct()
            .ToList();

        return new TravelContext(user, savedPlaces, interests, await DestinationAsync(message, cancellationToken));
    }

    private async Task<DestinationContext?> DestinationAsync(string message, CancellationToken cancellationToken)
    {
        var lower = message.ToLowerInvariant();
        var cities = await db.Locations.Select(l => l.CityName).Where(c => c != "").Distinct().ToListAsync(cancellationToken);
        var countries = await db.Locations.Select(l => l.CountryName).Where(c => c != "").Distinct().ToListAsync(cancellationToken);

        var city = cities.FirstOrDefault(c => lower.Contains(c.ToLowerInvariant()));
        var country = city is null ? countries.FirstOrDefault(c => lower.Contains(c.ToLowerInvariant())) : null;
        if (city is null && country is null)
            return null;

        var destination = (city ?? country)!.ToLower();
        var inDestination = db.Locations
            .Include(l => l.LocationTags).ThenInclude(lt => lt.Tag)
            .Where(l => city != null ? l.CityName.ToLower() == destination : l.CountryName.ToLower() == destination);

        var category = AiChatRules.DetectCategory(message);
        var matching = category is null
            ? []
            : await inDestination.Where(l => l.Category != null && l.Category.ToLower() == category.ToLower())
                .Take(PlacesPerDestination).ToListAsync(cancellationToken);
        var places = matching.Count > 0 ? matching : await inDestination.Take(PlacesPerDestination).ToListAsync(cancellationToken);

        return new DestinationContext(
            city ?? country!,
            category,
            places.Select(l => new NearbyPlace(l, TagNames(l, TagsPerDestinationPlace))).ToList(),
            matching.Count > 0);
    }

    private static IReadOnlyList<string> TagNames(Location location, int max) =>
        location.LocationTags
            .Where(lt => lt.Tag is not null)
            .Select(lt => lt.Tag.Name)
            .Distinct()
            .Take(max)
            .ToList();
}
