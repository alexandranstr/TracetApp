using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Tracet.Application.Abstractions;
using Tracet.Domain.Constants;

namespace Tracet.Infrastructure.Ai;

public sealed class GeminiModel(HttpClient http, IConfiguration configuration) : IAiModel
{
    public const string BaseAddress = "https://generativelanguage.googleapis.com/v1beta/";
    private const string ModelName = "gemini-3.5-flash";

    public string Provider => AiProviders.Gemini;

    public async Task<string> GenerateAsync(AiPrompt prompt, CancellationToken cancellationToken = default)
    {
        var apiKey = configuration["GeminiApiKey"];
        if (string.IsNullOrEmpty(apiKey))
            throw new AiUnavailableException("Gemini API key is not configured.");

        var contents = prompt.Conversation
            .Select(turn => new { role = turn.FromUser ? "user" : "model", parts = new[] { new { text = turn.Text } } })
            .Prepend(new { role = "user", parts = new[] { new { text = prompt.SystemPrompt } } });

        using var request = new HttpRequestMessage(HttpMethod.Post, $"models/{ModelName}:generateContent")
        {
            Content = JsonContent.Create(new { contents })
        };
        request.Headers.Add("x-goog-api-key", apiKey);

        try
        {
            using var response = await http.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
                throw new AiUnavailableException($"Gemini returned {(int)response.StatusCode}.");

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            return document.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString() ?? string.Empty;
        }
        catch (Exception ex) when (ex is not AiUnavailableException and not OperationCanceledException { CancellationToken.IsCancellationRequested: true })
        {
            throw new AiUnavailableException("Gemini could not be reached.", ex);
        }
    }
}
