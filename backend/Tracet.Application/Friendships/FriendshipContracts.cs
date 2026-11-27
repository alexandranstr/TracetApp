using System.ComponentModel.DataAnnotations;
using Tracet.Application.Common;

namespace Tracet.Application.Friendships;

public sealed record SendFriendRequest([Required] string ReceiverId);

public sealed record RespondToFriendRequest([Required] string SenderId, [Required] string Action);

public sealed record UserSearchResult(string Id, string Username, string DisplayName, string? PhotoUrl, string Status);

public sealed record SocialUser(string Id, string SenderId, string Username, string DisplayName, string? PhotoUrl);

public sealed record SocialOverview(
    IReadOnlyList<SocialUser> Friends,
    IReadOnlyList<SocialUser> IncomingRequests,
    IReadOnlyList<SocialUser> OutgoingRequests,
    Pagination Pagination);

public sealed record PendingFriendRequest(int Id, string SenderId, string Username, string DisplayName, string? PhotoUrl);

public sealed record PendingFriendRequests(int Count, IReadOnlyList<PendingFriendRequest> Requests, Pagination Pagination);
