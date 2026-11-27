using Microsoft.Extensions.DependencyInjection;
using Tracet.Application.Accounts;
using Tracet.Application.AiChat;
using Tracet.Application.Blocking;
using Tracet.Application.Friendships;
using Tracet.Application.Messaging;
using Tracet.Application.Pins;
using Tracet.Application.Pins.Statistics;
using Tracet.Application.Recommendations;
using Tracet.Application.Social;
using Tracet.Application.Tags;

namespace Tracet.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<ISocialGraph, SocialGraph>();
        services.AddScoped<IFriendshipService, FriendshipService>();
        services.AddScoped<IBlockingService, BlockingService>();
        services.AddScoped<IPinStatisticsService, PinStatisticsService>();
        services.AddScoped<IPinService, PinService>();
        services.AddScoped<IMessageService, MessageService>();
        services.AddScoped<ITagService, TagService>();
        services.AddScoped<IRecommendationService, RecommendationService>();
        services.AddScoped<IProfileService, ProfileService>();
        services.AddScoped<IAccountService, AccountService>();
        services.AddScoped<IAiChatService, AiChatService>();
        return services;
    }
}
