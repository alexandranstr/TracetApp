using Tracet.Application.Common;
using Tracet.Domain.Enums;

namespace Tracet.Application.Friendships;

public interface IFriendshipService
{
    Task<IReadOnlyList<UserSearchResult>> SearchUsersAsync(string userId, string? query, CancellationToken cancellationToken = default);

    Task<SocialOverview> GetSocialOverviewAsync(string userId, PageRequest page, CancellationToken cancellationToken = default);

    Task<PendingFriendRequests> GetPendingRequestsAsync(string userId, PageRequest page, CancellationToken cancellationToken = default);

    Task<Result> SendRequestAsync(string senderId, string receiverId, CancellationToken cancellationToken = default);

    Task<Result<FriendshipStatus>> RespondAsync(string receiverId, string senderId, string action, CancellationToken cancellationToken = default);
}
