using Tracet.Application.Common;

namespace Tracet.Application.Tags;

public static class TagVector
{
    public static IReadOnlyList<int> Parse(string? json) => JsonList.Parse<int>(json);

    public static string Serialize(IEnumerable<int> tagIds) => JsonList.Serialize(tagIds);
}
