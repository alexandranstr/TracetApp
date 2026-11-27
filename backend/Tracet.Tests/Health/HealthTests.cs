using Tracet.Tests.Infrastructure;
using Xunit;

namespace Tracet.Tests.Health;

public class HealthTests : IClassFixture<TracetApiFactory>
{
    private readonly TracetApiFactory _api;

    public HealthTests(TracetApiFactory api) => _api = api;

    [Theory]
    [InlineData("/api/health")]
    [InlineData("/api/health/ready")]
    public async Task Health_endpoints_are_public_and_report_healthy(string url)
    {
        var health = await _api.AnonymousClient().GetJsonAsync(url);

        Assert.Equal("healthy", health.GetProperty("status").GetString());
    }
}
