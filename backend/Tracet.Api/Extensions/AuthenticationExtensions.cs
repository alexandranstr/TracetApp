using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace Tracet.Api.Extensions;

public static class AuthenticationExtensions
{
    public const string ChatHubPath = "/chathub";

    public static IServiceCollection AddFirebaseAuthentication(this IServiceCollection services, string firebaseProjectId)
    {
        var issuer = $"https://securetoken.google.com/{firebaseProjectId}";

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = issuer;
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = issuer,
                    ValidateAudience = true,
                    ValidAudience = firebaseProjectId,
                    ValidateLifetime = true,
                    NameClaimType = "user_id"
                };
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var token = context.Request.Query["access_token"];
                        if (!string.IsNullOrEmpty(token) && context.HttpContext.Request.Path.StartsWithSegments(ChatHubPath))
                            context.Token = token;
                        return Task.CompletedTask;
                    }
                };
            });

        return services;
    }
}
