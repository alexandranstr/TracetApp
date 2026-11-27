using Tracet.Domain.Constants;

namespace Tracet.Application.AiChat;

public static class AiChatRules
{
    public const int MaxMessageLength = 2000;
    public const int MaxContextMessages = 20;
    public const string GeminiUnavailableReply = "Sorry, Gemini is not available right now. Tracey will try to help you while Gemini is away.";
    public const string TraceyUnavailableReply = "Sorry, Tracey is not available right now. Please check your connection.";

    private static readonly string[] ManipulationPhrases =
    [
        "ignore the above",
        "ignore instructions",
        "disregard above",
        "forget your instructions",
        "system prompt",
        "you are now",
        "pretend to be",
        "act as if you were",
        "ignore all previous",
        "repeat the prompt",
        "print the prompt",
        "what is your prompt",
        "what are your instructions",
        " disregard"
    ];

    private static readonly (string Keyword, string Category)[] CategoryKeywords =
    [
        ("restaurant", "Restaurant"), ("restaurante", "Restaurant"), ("restaurang", "Restaurant"),
        ("mancare", "Restaurant"), ("food", "Restaurant"), ("dine", "Restaurant"),
        ("cafenea", "Cafe"), ("cafenele", "Cafe"), ("cafe", "Cafe"), ("cofee", "Cafe"), ("coffee", "Cafe"),
        ("muzeu", "Museum"), ("muzee", "Museum"), ("museum", "Museum"),
        ("parc", "Park"), ("park", "Park"),
        ("hotel", "Hotel"),
        ("atracție", "Attraction"), ("atracții", "Attraction"), ("attraction", "Attraction"),
        ("shop", "Shop"), ("magazin", "Shop"), ("shopping", "Shopping"),
        ("nightlife", "Nightlife"), ("bar", "Nightlife"), ("club", "Nightlife"),
        ("sport", "Sports"),
        ("nature", "Nature"), ("natură", "Nature"),
        ("landmark", "Landmark"), ("monument", "Landmark"),
        ("transport", "Transport"),
        ("accommodation", "Accommodation"), ("cazare", "Accommodation")
    ];

    public static string Provider(string? requested) =>
        string.Equals(requested?.Trim(), AiProviders.Tracey, StringComparison.OrdinalIgnoreCase) ? AiProviders.Tracey : AiProviders.Gemini;

    public static string Truncate(string message) =>
        message.Length > MaxMessageLength ? message[..MaxMessageLength] : message;

    public static bool LooksLikeManipulation(string message)
    {
        var lower = message.ToLowerInvariant();
        return ManipulationPhrases.Any(lower.Contains);
    }

    public static string? DetectCategory(string message)
    {
        var lower = message.ToLowerInvariant();
        return CategoryKeywords.FirstOrDefault(k => lower.Contains(k.Keyword)).Category;
    }
}
