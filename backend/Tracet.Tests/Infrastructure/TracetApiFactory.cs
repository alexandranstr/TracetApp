using System.Net.Http.Headers;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Tracet.Application.Abstractions;
using Tracet.Infrastructure.Persistence;

namespace Tracet.Tests.Infrastructure;

public class TracetApiFactory : WebApplicationFactory<Program>
{
    // The in-memory database is dropped when this connection closes.
    private readonly SqliteConnection _connection = new("DataSource=:memory:");

    public FakeIdentityProvider Identity { get; } = new();
    public FakeFileStorage Storage { get; } = new();
    public FakeAiModel Gemini { get; } = new("gemini");
    public FakeAiModel Tracey { get; } = new("tracey");

    public TracetApiFactory()
    {
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services => services.AddTransient<IStartupFilter, ThrowingEndpointFilter>());

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection));
            services.RemoveAll<IIdentityProvider>();
            services.RemoveAll<IFileStorage>();
            services.AddSingleton<IIdentityProvider>(Identity);
            services.AddSingleton<IFileStorage>(Storage);
            services.RemoveAll<IAiModel>();
            services.AddSingleton<IAiModel>(Gemini);
            services.AddSingleton<IAiModel>(Tracey);

            services.AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
            services.PostConfigure<AuthenticationOptions>(options =>
            {
                options.DefaultScheme = TestAuthHandler.SchemeName;
                options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
            });
        });
    }

    public HttpClient ClientFor(string userId)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserHeader, userId);
        return client;
    }

    public HttpClient AnonymousClient() => CreateClient();

    public HubConnection HubFor(string userId)
    {
        CreateClient().Dispose();
        return new HubConnectionBuilder()
            .WithUrl(new Uri(Server.BaseAddress, "/chathub"), options =>
            {
                options.HttpMessageHandlerFactory = _ => Server.CreateHandler();
                options.Transports = HttpTransportType.LongPolling;
                options.Headers.Add(TestAuthHandler.UserHeader, userId);
            })
            .Build();
    }

    public async Task WithDbAsync(Func<AppDbContext, Task> action)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await action(db);
    }

    public async Task<T> WithDbAsync<T>(Func<AppDbContext, Task<T>> action)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await action(db);
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) _connection.Dispose();
    }
}

public sealed class ThrowingEndpointFilter : IStartupFilter
{
    public const string Path = "/test/throw";
    public const string Secret = "connection string password=hunter2";

    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
    {
        next(app);
        app.Map(Path, branch => branch.Run(_ => throw new InvalidOperationException(Secret)));
    };
}
