namespace Tracet.Application.Abstractions;

public interface IIdentityProvider
{
    Task DeleteUserAsync(string userId, CancellationToken cancellationToken = default);
}
