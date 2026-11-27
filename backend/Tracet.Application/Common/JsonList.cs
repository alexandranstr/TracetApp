using System.Text.Json;

namespace Tracet.Application.Common;

public static class JsonList
{
    public static IReadOnlyList<T> Parse<T>(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<T>>(json) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    public static string Serialize<T>(IEnumerable<T> items) => JsonSerializer.Serialize(items);
}
