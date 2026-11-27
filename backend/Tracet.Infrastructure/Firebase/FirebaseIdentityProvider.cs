using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Tracet.Application.Abstractions;

namespace Tracet.Infrastructure.Firebase;

public sealed class FirebaseIdentityProvider : IIdentityProvider
{
    public async Task DeleteUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        if (FirebaseApp.DefaultInstance is null) return;

        try
        {
            await FirebaseAuth.DefaultInstance.DeleteUserAsync(userId, cancellationToken);
        }
        catch (FirebaseAuthException ex) when (ex.AuthErrorCode == AuthErrorCode.UserNotFound)
        {
        }
    }
}
