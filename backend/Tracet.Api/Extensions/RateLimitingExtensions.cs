using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace Tracet.Api.Extensions;

public static class RateLimitPolicies
{
    public const string Global = "global";
    public const string Auth = "auth";
    public const string Ai = "ai";
}

public static class RateLimitingExtensions
{
    public static IServiceCollection AddTracetRateLimiting(this IServiceCollection services) =>
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            AddPerClientPolicy(options, RateLimitPolicies.Global, permits: 100, window: TimeSpan.FromSeconds(10));
            AddPerClientPolicy(options, RateLimitPolicies.Auth, permits: 10, window: TimeSpan.FromMinutes(1));
            AddPerClientPolicy(options, RateLimitPolicies.Ai, permits: 10, window: TimeSpan.FromMinutes(1));
        });

    private static void AddPerClientPolicy(RateLimiterOptions options, string policy, int permits, TimeSpan window) =>
        options.AddPolicy(policy, context => RateLimitPartition.GetFixedWindowLimiter(
            ClientKey(context),
            _ => new FixedWindowRateLimiterOptions { PermitLimit = permits, Window = window, QueueLimit = 0 }));

    private static string ClientKey(HttpContext context) =>
        context.User.Identity?.IsAuthenticated == true
            ? $"user:{context.User.GetUserId()}"
            : $"ip:{context.Connection.RemoteIpAddress}";
}
