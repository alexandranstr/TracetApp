using System.Collections.Concurrent;
using Tracet.Application.Abstractions;

namespace Tracet.Tests.Infrastructure;

public sealed class FakeIdentityProvider : IIdentityProvider
{
    public ConcurrentBag<string> DeletedUsers { get; } = [];

    public Task DeleteUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        DeletedUsers.Add(userId);
        return Task.CompletedTask;
    }
}

public sealed class FakeFileStorage : IFileStorage
{
    public ConcurrentBag<(string OwnerId, string Url)> DeletedFiles { get; } = [];

    public Task DeleteUserFileAsync(string ownerId, string fileUrl, CancellationToken cancellationToken = default)
    {
        DeletedFiles.Add((ownerId, fileUrl));
        return Task.CompletedTask;
    }
}

public sealed class FakeAiModel(string provider) : IAiModel
{
    public string Provider { get; } = provider;
    public bool Available { get; set; } = true;
    public ConcurrentQueue<AiPrompt> Prompts { get; } = new();

    public Task<string> GenerateAsync(AiPrompt prompt, CancellationToken cancellationToken = default)
    {
        Prompts.Enqueue(prompt);
        return Available
            ? Task.FromResult($"{Provider} reply to: {prompt.Conversation[^1].Text}")
            : throw new AiUnavailableException($"{Provider} is down");
    }
}
