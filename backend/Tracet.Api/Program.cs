using Tracet.Application;
using Tracet.Api.Extensions;
using Tracet.Infrastructure;
using Tracet.Infrastructure.Firebase;

Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Development");
var builder = WebApplication.CreateBuilder(args);
var dataDirectory = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", "data"));

FirebaseSetup.EnsureInitialized(Setting("FIREBASE_SERVICE_ACCOUNT_KEY_PATH", Path.Combine(dataDirectory, "serviceAccountKey.json")));

builder.Services
    .AddFirebaseAuthentication(Setting("FIREBASE_PROJECT_ID", "tracet-c5152"))
    .AddApplication()
    .AddInfrastructure(Setting("DATABASE_CONNECTION_STRING", $"Data Source={Path.Combine(dataDirectory, "tracet.db")}"))
    .AddTracetApi();

var app = builder.Build();
app.UseTracetPipeline();
app.Run(Setting("ASPNETCORE_URLS", "http://0.0.0.0:5001"));

static string Setting(string name, string fallback) => Environment.GetEnvironmentVariable(name) ?? fallback;

public partial class Program;
