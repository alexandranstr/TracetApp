using Tracet.Application.Common;

namespace Tracet.Application.Accounts;

public static class Usernames
{
    public const int MinLength = 3;
    public const int MaxLength = 30;

    public static string Normalize(string username) =>
        username.Trim().TrimStart('@').ToLowerInvariant().Replace(' ', '_');

    public static Error? Validate(string normalized) =>
        normalized.Length is < MinLength or > MaxLength
            ? Error.Validation($"Username must be between {MinLength} and {MaxLength} characters.")
            : null;
}
