using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Tracet.Application.Messaging;
using Tracet.Api.Contracts;
using Tracet.Api.Hubs;
using Tracet.Api.Middleware;

namespace Tracet.Api.Extensions;

public static class ApiServiceCollectionExtensions
{
    public const string CorsPolicy = "TracetApp";

    private static readonly string[] AllowedOrigins =
    [
        "http://localhost:5000",
        "http://localhost:5001",
        "http://localhost:8081",
        "http://10.0.2.2:5000",
        "http://10.0.2.2:5001"
    ];

    public static IServiceCollection AddTracetApi(this IServiceCollection services)
    {
        services
            .AddControllers(options => options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true)
            .ConfigureApiBehaviorOptions(options => options.InvalidModelStateResponseFactory = context =>
                new BadRequestObjectResult(new ErrorResponse(
                    context.ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .FirstOrDefault(message => !string.IsNullOrEmpty(message))
                    ?? "The request is invalid.")));

        services.AddExceptionHandler<UnhandledExceptionHandler>();
        services.AddProblemDetails();
        services.AddSignalR();
        services.AddSingleton<IUserIdProvider, FirebaseUserIdProvider>();
        services.AddScoped<IChatNotifier, SignalRChatNotifier>();
        services.AddCors(options => options.AddPolicy(CorsPolicy, policy => policy
            .WithOrigins(AllowedOrigins)
            .WithHeaders("Content-Type", "Authorization", "Accept")
            .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")));
        services.AddHttpClient();
        services.AddMemoryCache();
        services.AddHealthChecks();
        services.AddTracetRateLimiting();
        return services;
    }
}
