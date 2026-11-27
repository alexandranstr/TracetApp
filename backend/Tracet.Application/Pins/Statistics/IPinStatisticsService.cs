namespace Tracet.Application.Pins.Statistics;

public interface IPinStatisticsService
{
    Task<PinStatistics> GetAsync(string userId, CancellationToken cancellationToken = default);

    void Invalidate(string userId);
}
