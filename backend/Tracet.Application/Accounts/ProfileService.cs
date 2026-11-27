using Microsoft.EntityFrameworkCore;
using Tracet.Application.Abstractions;
using Tracet.Application.Common;
using Tracet.Domain.Entities;

namespace Tracet.Application.Accounts;

public interface IProfileService
{
    Task<UserProfile> SyncAsync(string userId, string? email, string? name, CancellationToken cancellationToken = default);

    Task<Result<UserProfile>> GetAsync(string userId, CancellationToken cancellationToken = default);

    Task<Result<UserProfile>> UpdateAsync(string userId, UpdateProfileRequest request, CancellationToken cancellationToken = default);

    Task<Result<TwoFactorStatus>> SetTwoFactorAsync(string userId, bool enable, CancellationToken cancellationToken = default);

    Task<Result<ResolvedEmail>> ResolveEmailAsync(string username, CancellationToken cancellationToken = default);
}

public sealed class ProfileService(IAppDbContext db) : IProfileService
{
    public async Task<UserProfile> SyncAsync(string userId, string? email, string? name, CancellationToken cancellationToken = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
                   ?? db.Users.Add(new User { Id = userId, CreatedAt = DateTime.UtcNow }).Entity;

        user.Email = email ?? string.Empty;
        if (string.IsNullOrEmpty(user.DisplayName) && !string.IsNullOrEmpty(name))
            user.DisplayName = name;

        await db.SaveChangesAsync(cancellationToken);
        return UserProfile.From(user);
    }

    public async Task<Result<UserProfile>> GetAsync(string userId, CancellationToken cancellationToken = default)
    {
        var user = await FindAsync(userId, cancellationToken);
        return user is null ? Error.NotFound("User not found.") : UserProfile.From(user);
    }

    public async Task<Result<UserProfile>> UpdateAsync(string userId, UpdateProfileRequest request, CancellationToken cancellationToken = default)
    {
        var user = await FindAsync(userId, cancellationToken);
        if (user is null)
            return Error.NotFound("User not found.");

        if (!string.IsNullOrWhiteSpace(request.Username))
        {
            var username = Usernames.Normalize(request.Username);
            if (Usernames.Validate(username) is { } error)
                return error;
            if (await db.Users.AnyAsync(u => u.Username == username && u.Id != userId, cancellationToken))
                return Error.Validation("Username is already taken.");
            user.Username = username;
        }

        if (!string.IsNullOrWhiteSpace(request.DisplayName))
            user.DisplayName = request.DisplayName.Trim();
        if (request.PhotoUrl is not null)
            user.PhotoUrl = NullIfBlank(request.PhotoUrl);
        if (request.PhoneNumber is not null)
        {
            user.PhoneNumber = NullIfBlank(request.PhoneNumber);
            user.IsPhoneVerified = user.PhoneNumber is not null;
        }
        if (request.HomeCountry is not null)
            user.HomeCountry = request.HomeCountry;

        await db.SaveChangesAsync(cancellationToken);
        return UserProfile.From(user);
    }

    public async Task<Result<TwoFactorStatus>> SetTwoFactorAsync(string userId, bool enable, CancellationToken cancellationToken = default)
    {
        var user = await FindAsync(userId, cancellationToken);
        if (user is null)
            return Error.NotFound("User not found.");
        if (enable && (string.IsNullOrWhiteSpace(user.PhoneNumber) || !user.IsPhoneVerified))
            return Error.Validation("Please add and verify a phone number before enabling 2FA.");

        user.IsTwoFactorEnabled = enable;
        await db.SaveChangesAsync(cancellationToken);
        return new TwoFactorStatus(user.IsTwoFactorEnabled);
    }

    public async Task<Result<ResolvedEmail>> ResolveEmailAsync(string username, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(username))
            return Error.Validation("Username required.");

        var normalized = Usernames.Normalize(username);
        var email = await db.Users
            .Where(u => u.Username.ToLower() == normalized)
            .Select(u => u.Email)
            .FirstOrDefaultAsync(cancellationToken);

        return string.IsNullOrEmpty(email) ? Error.NotFound("User not found.") : new ResolvedEmail(email);
    }

    private Task<User?> FindAsync(string userId, CancellationToken cancellationToken) =>
        db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

    private static string? NullIfBlank(string value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
