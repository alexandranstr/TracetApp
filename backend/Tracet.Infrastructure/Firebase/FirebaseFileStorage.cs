using System.Net;
using FirebaseAdmin;
using Google;
using Google.Cloud.Storage.V1;
using Microsoft.Extensions.Logging;
using Tracet.Application.Abstractions;

namespace Tracet.Infrastructure.Firebase;

public sealed class FirebaseFileStorage(ILogger<FirebaseFileStorage> logger) : IFileStorage
{
    private const string FirebaseStorageHost = "firebasestorage.googleapis.com";

    private readonly Lazy<StorageClient?> _client = new(CreateClient);

    public async Task DeleteUserFileAsync(string ownerId, string fileUrl, CancellationToken cancellationToken = default)
    {
        try
        {
            if (TryParseStorageObject(fileUrl, out var bucket, out var objectName) && IsOwnedBy(objectName, ownerId) && _client.Value is { } client)
                await client.DeleteObjectAsync(bucket, objectName, cancellationToken: cancellationToken);
        }
        catch (GoogleApiException ex) when (ex.HttpStatusCode == HttpStatusCode.NotFound)
        {
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not delete file {FileUrl}", fileUrl);
        }
    }

    private static bool TryParseStorageObject(string fileUrl, out string bucket, out string objectName)
    {
        bucket = objectName = string.Empty;
        if (!Uri.TryCreate(fileUrl, UriKind.Absolute, out var uri) || uri.Host != FirebaseStorageHost)
            return false;

        var segments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var bucketIndex = Array.IndexOf(segments, "b");
        var objectIndex = Array.IndexOf(segments, "o");
        if (bucketIndex < 0 || objectIndex != bucketIndex + 2 || objectIndex + 1 >= segments.Length)
            return false;

        bucket = segments[bucketIndex + 1];
        objectName = Uri.UnescapeDataString(string.Join('/', segments[(objectIndex + 1)..]));
        return true;
    }

    private static bool IsOwnedBy(string objectName, string ownerId) =>
        objectName.Split('/') is [_, var folderOwner, ..] && folderOwner == ownerId;

    private static StorageClient? CreateClient() =>
        FirebaseApp.DefaultInstance?.Options.Credential is { } credential ? StorageClient.Create(credential) : null;
}
