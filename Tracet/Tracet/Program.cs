using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Tracet.data;
using Tracet.hubs;

var builder = WebApplication.CreateBuilder(args);

if (FirebaseApp.DefaultInstance == null)
{
    var serviceAccountKeyPath = Environment.GetEnvironmentVariable("FIREBASE_SERVICE_ACCOUNT_KEY_PATH") ?? "serviceAccountKey.json";
    if (File.Exists(serviceAccountKeyPath))
    {
        FirebaseApp.Create(new AppOptions
        {
            Credential = GoogleCredential.FromFile(serviceAccountKeyPath)
        });
    }
    else
    {
        Console.WriteLine($"[Warning] Firebase service account key not found at {serviceAccountKeyPath}. Authentication will fail.");
    }
}

var firebaseProjectId = Environment.GetEnvironmentVariable("FIREBASE_PROJECT_ID") ?? "tracet-c5152";
var firebaseAuthDomain = $"https://securetoken.google.com/{firebaseProjectId}";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = firebaseAuthDomain;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = firebaseAuthDomain,
            ValidateAudience = true,
            ValidAudience = firebaseProjectId,
            ValidateLifetime = true,
            NameClaimType = "user_id"
        };
    });

var connectionString = Environment.GetEnvironmentVariable("DATABASE_CONNECTION_STRING") ?? "Data Source=tracet.db";
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));

builder.Services.AddSignalR();

builder.Services.AddCors(options =>
{
    options.AddPolicy("TracetApp", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5000",
                "http://localhost:8081",
                "http://10.0.2.2:5000"
            )
            .WithHeaders(
                "Content-Type",
                "Authorization",
                "Accept"
            )
            .WithMethods(
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "OPTIONS"
            );
    });
});

builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("global", l =>
    {
        l.PermitLimit = 100;
        l.Window = TimeSpan.FromSeconds(10);
        l.QueueLimit = 0;
    });

    options.AddFixedWindowLimiter("auth", l =>
    {
        l.PermitLimit = 10;
        l.Window = TimeSpan.FromSeconds(60);
        l.QueueLimit = 0;
    });

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.OnRejected = (context, token) =>
    {
        Console.WriteLine($"[RateLimit] Request rejected to {context.HttpContext.Request.Path}");
        return default;
    };
});

builder.Services.AddControllers();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
}

app.Use((context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "0");
    context.Response.Headers.Append("Referrer-Policy", "no-referrer");
    context.Response.Headers.Append("Cache-Control", "no-store");
    return next();
});

var uploadsPath = Path.Combine(builder.Environment.ContentRootPath, "uploads");
if (!Directory.Exists(uploadsPath))
{
    Directory.CreateDirectory(uploadsPath);
}

app.UseRateLimiter();
app.UseCors("TracetApp");
app.UseRouting();
app.UseStaticFiles();
app.UseFileServer(new FileServerOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads",
    EnableDirectoryBrowsing = false
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/chathub");

app.MapGet("/", () => "Tracet API is running!");

app.Run();