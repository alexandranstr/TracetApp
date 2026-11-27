using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Tracet.Tests.Infrastructure;
using Xunit;

namespace Tracet.Tests.Errors;

public class ErrorHandlingTests : IClassFixture<TracetApiFactory>
{
    private readonly TracetApiFactory _api;

    public ErrorHandlingTests(TracetApiFactory api) => _api = api;

    [Fact]
    public async Task Unexpected_errors_return_500_without_internal_details()
    {
        var response = await _api.AnonymousClient().GetAsync(ThrowingEndpointFilter.Path);
        var raw = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.DoesNotContain("hunter2", raw);
        Assert.DoesNotContain(nameof(InvalidOperationException), raw);
        var body = JsonSerializer.Deserialize<JsonElement>(raw);
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("message").GetString()));
    }
}
