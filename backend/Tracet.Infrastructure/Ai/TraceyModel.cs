using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Tracet.Application.Abstractions;
using Tracet.Domain.Constants;

namespace Tracet.Infrastructure.Ai;

public sealed class TraceyModel(HttpClient http) : IAiModel
{
    public const string DefaultBaseAddress = "http://localhost:11434/";
    private const string ModelName = "tracey";
    private const int RecentTurns = 10;

    public string Provider => AiProviders.Tracey;

    public async Task<string> GenerateAsync(AiPrompt prompt, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await http.PostAsJsonAsync(
                "api/generate",
                new { model = ModelName, prompt = Render(prompt), stream = false },
                cancellationToken);
            if (!response.IsSuccessStatusCode)
                throw new AiUnavailableException($"Tracey returned {(int)response.StatusCode}.");

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            return document.RootElement.GetProperty("response").GetString() ?? string.Empty;
        }
        catch (Exception ex) when (ex is not AiUnavailableException and not OperationCanceledException { CancellationToken.IsCancellationRequested: true })
        {
            throw new AiUnavailableException("Tracey could not be reached.", ex);
        }
    }

    private static string Render(AiPrompt prompt)
    {
        var text = new StringBuilder().AppendLine(prompt.SystemPrompt).AppendLine();
        var earlier = prompt.Conversation.SkipLast(1).TakeLast(RecentTurns).ToList();
        if (earlier.Count > 0)
        {
            text.AppendLine("Recent conversation:");
            earlier.ForEach(turn => text.AppendLine($"{(turn.FromUser ? "User" : "AI")}: {turn.Text}"));
            text.AppendLine();
        }

        return text
            .AppendLine($"User: {prompt.Conversation[^1].Text}")
            .AppendLine("AI:")
            .ToString();
    }
}
