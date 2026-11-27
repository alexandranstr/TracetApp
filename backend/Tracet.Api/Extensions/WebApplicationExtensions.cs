using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Tracet.Api.Hubs;
using Tracet.Infrastructure;
using Tracet.Api.Middleware;

namespace Tracet.Api.Extensions;

public static class WebApplicationExtensions
{
    public static WebApplication UseTracetPipeline(this WebApplication app)
    {
        app.Services.MigrateDatabase();

        app.UseExceptionHandler();
        app.Use((context, next) =>
        {
            var headers = context.Response.Headers;
            headers.Append("X-Content-Type-Options", "nosniff");
            headers.Append("X-Frame-Options", "DENY");
            headers.Append("X-XSS-Protection", "0");
            headers.Append("Referrer-Policy", "no-referrer");
            headers.Append("Cache-Control", "no-store");
            return next();
        });

        app.UseCors(ApiServiceCollectionExtensions.CorsPolicy);
        app.UseRouting();

        app.UseAuthentication();
        app.UseRateLimiter();
        app.UseAuthorization();

        app.MapControllers();
        app.MapHub<ChatHub>(AuthenticationExtensions.ChatHubPath);
        app.MapHealthChecks("/api/health", new HealthCheckOptions { Predicate = _ => false, ResponseWriter = WriteHealth });
        app.MapHealthChecks("/api/health/ready", new HealthCheckOptions { Predicate = check => check.Tags.Contains(HealthTags.Ready), ResponseWriter = WriteHealth });
        app.MapGet("/", () => "Tracet API is running!");
        return app;
    }

    private static Task WriteHealth(HttpContext context, HealthReport report) =>
        context.Response.WriteAsJsonAsync(new { status = report.Status.ToString().ToLowerInvariant() });
}
