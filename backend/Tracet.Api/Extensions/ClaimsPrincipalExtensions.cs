using System.Security.Claims;

namespace Tracet.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    private const string FirebaseUserIdClaim = "user_id";
    private const string EmailClaim = "email";
    private const string NameClaim = "name";

    public static string GetUserId(this ClaimsPrincipal user) =>
        user.FindFirstValue(FirebaseUserIdClaim)
        ?? throw new InvalidOperationException("The authenticated user has no user_id claim.");

    public static string? GetEmail(this ClaimsPrincipal user) => user.FindFirstValue(EmailClaim);

    public static string? GetName(this ClaimsPrincipal user) => user.FindFirstValue(NameClaim);
}
