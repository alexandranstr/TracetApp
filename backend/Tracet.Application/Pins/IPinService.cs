using Tracet.Application.Common;

namespace Tracet.Application.Pins;

public interface IPinService
{
    Task<IReadOnlyList<PinResponse>> GetNearbyAsync(string userId, BoundingBox area, CancellationToken cancellationToken = default);

    Task<PinsPage> GetVisibleAsync(string userId, PageRequest page, CancellationToken cancellationToken = default);

    Task<PinsPage> GetSharedHistoryAsync(string userId, PageRequest page, CancellationToken cancellationToken = default);

    Task<PinsPage> GetMineAsync(string userId, PageRequest page, CancellationToken cancellationToken = default);

    Task<Result<PinResponse>> CreateAsync(string userId, CreatePinRequest request, CancellationToken cancellationToken = default);

    Task<Result<PinResponse>> UpdateAsync(string userId, int pinId, UpdatePinRequest request, CancellationToken cancellationToken = default);

    Task<Result<PinResponse>> ToggleVisibilityAsync(string userId, int pinId, CancellationToken cancellationToken = default);

    Task<Result> DeleteAsync(string userId, int pinId, CancellationToken cancellationToken = default);
}
