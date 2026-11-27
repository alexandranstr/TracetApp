using Microsoft.AspNetCore.SignalR;
using Tracet.Api.Extensions;

namespace Tracet.Api.Hubs;

public sealed class FirebaseUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection) =>
        connection.User.Identity?.IsAuthenticated == true ? connection.User.GetUserId() : null;
}
