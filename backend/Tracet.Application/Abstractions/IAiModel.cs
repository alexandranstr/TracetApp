namespace Tracet.Application.Abstractions;

public sealed record AiTurn(bool FromUser, string Text);

public sealed record AiPrompt(string SystemPrompt, IReadOnlyList<AiTurn> Conversation);

public interface IAiModel
{
    string Provider { get; }

    Task<string> GenerateAsync(AiPrompt prompt, CancellationToken cancellationToken = default);
}

public sealed class AiUnavailableException(string message, Exception? innerException = null)
    : Exception(message, innerException);
