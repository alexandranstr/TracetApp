namespace Tracet.Application.Common;

public enum ErrorType
{
    Validation,
    NotFound,
    Forbidden
}

public sealed record Error(ErrorType Type, string Message)
{
    public static Error Validation(string message) => new(ErrorType.Validation, message);
    public static Error NotFound(string message) => new(ErrorType.NotFound, message);
    public static Error Forbidden(string message) => new(ErrorType.Forbidden, message);
}
