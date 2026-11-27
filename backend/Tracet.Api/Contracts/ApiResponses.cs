namespace Tracet.Api.Contracts;

public sealed record MessageResponse(bool Success, string Message);

public sealed record ErrorResponse(string Message);
