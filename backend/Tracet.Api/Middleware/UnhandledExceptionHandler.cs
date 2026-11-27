using Microsoft.AspNetCore.Diagnostics;
using Tracet.Api.Contracts;

namespace Tracet.Api.Middleware;

public sealed class UnhandledExceptionHandler(ILogger<UnhandledExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        if (context.RequestAborted.IsCancellationRequested)
            return true;

        logger.LogError(exception, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(
            new ErrorResponse("Something went wrong on our side. Please try again."), cancellationToken);
        return true;
    }
}
