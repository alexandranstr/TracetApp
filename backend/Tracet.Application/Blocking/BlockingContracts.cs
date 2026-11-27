using System.ComponentModel.DataAnnotations;
using Tracet.Application.Common;

namespace Tracet.Application.Blocking;

public sealed record BlockUserRequest([Required] string TargetUserId);

public sealed record BlockStatus(bool YouBlockedPartner, bool PartnerBlockedYou);

public sealed record BlockedUserItem(string BlockedUserId, string Username, string DisplayName, string? PhotoUrl, DateTime BlockedAt);

public sealed record BlockedUsersPage(IReadOnlyList<BlockedUserItem> BlockedUsers, Pagination Pagination);
