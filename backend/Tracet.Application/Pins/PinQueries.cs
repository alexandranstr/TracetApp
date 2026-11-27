using System.Linq.Expressions;
using Tracet.Domain.Entities;

namespace Tracet.Application.Pins;

public sealed record PinAudience(string UserId, IReadOnlyList<string> FriendIds, IReadOnlyList<string> BlockedUserIds);

public static class PinQueries
{
    public static Expression<Func<Pin, bool>> VisibleTo(PinAudience audience) =>
        p => !audience.BlockedUserIds.Contains(p.UserId) &&
             (p.UserId == audience.UserId || (audience.FriendIds.Contains(p.UserId) && !p.IsPrivate));

    public static Expression<Func<Pin, bool>> SharedWith(PinAudience audience) =>
        p => audience.FriendIds.Contains(p.UserId) &&
             !audience.BlockedUserIds.Contains(p.UserId) &&
             !p.IsPrivate;

    public static Expression<Func<Pin, bool>> Within(BoundingBox box) =>
        p => p.Location.Latitude >= box.SouthWestLatitude &&
             p.Location.Latitude <= box.NorthEastLatitude &&
             p.Location.Longitude >= box.SouthWestLongitude &&
             p.Location.Longitude <= box.NorthEastLongitude;
}
