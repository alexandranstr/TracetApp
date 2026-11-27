namespace Tracet.Application.Abstractions;

public interface IFileStorage
{
    Task DeleteUserFileAsync(string ownerId, string fileUrl, CancellationToken cancellationToken = default);
}
