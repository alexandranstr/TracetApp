using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Polly;
using Tracet.Application.Abstractions;
using Tracet.Infrastructure.Ai;
using Tracet.Infrastructure.Firebase;
using Tracet.Infrastructure.Persistence;

namespace Tracet.Infrastructure;

public static class HealthTags
{
    public const string Ready = "ready";
}

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));
        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());
        services.AddHealthChecks().AddDbContextCheck<AppDbContext>("database", tags: [HealthTags.Ready]);
        services.AddSingleton<IIdentityProvider, FirebaseIdentityProvider>();
        services.AddSingleton<IFileStorage, FirebaseFileStorage>();
        services.AddAiModels();
        return services;
    }

    public static void MigrateDatabase(this IServiceProvider services)
    {
        using var scope = services.CreateScope();
        scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
    }

    private static void AddAiModels(this IServiceCollection services)
    {
        services.AddHttpClient<GeminiModel>(client =>
            {
                client.BaseAddress = new Uri(GeminiModel.BaseAddress);
                client.Timeout = TimeSpan.FromMinutes(5);
            })
            .AddStandardResilienceHandler(options =>
            {
                options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(60);
                options.TotalRequestTimeout.Timeout = TimeSpan.FromMinutes(4);
                options.Retry.MaxRetryAttempts = 3;
                options.Retry.Delay = TimeSpan.FromSeconds(2);
                options.Retry.BackoffType = DelayBackoffType.Exponential;
                options.CircuitBreaker.SamplingDuration = TimeSpan.FromMinutes(2);
                options.CircuitBreaker.MinimumThroughput = 5;
                options.CircuitBreaker.BreakDuration = TimeSpan.FromSeconds(30);
            });

        services.AddHttpClient<TraceyModel>((provider, client) =>
            client.BaseAddress = new Uri(provider.GetRequiredService<IConfiguration>()["Ollama:BaseUrl"] ?? TraceyModel.DefaultBaseAddress));

        services.AddTransient<IAiModel>(provider => provider.GetRequiredService<GeminiModel>());
        services.AddTransient<IAiModel>(provider => provider.GetRequiredService<TraceyModel>());
    }
}
