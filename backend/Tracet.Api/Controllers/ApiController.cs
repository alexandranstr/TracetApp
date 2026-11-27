using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tracet.Application.Common;
using Tracet.Api.Contracts;
using Tracet.Api.Extensions;

namespace Tracet.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public abstract class ApiController : ControllerBase
{
    protected string CurrentUserId => User.GetUserId();

    protected IActionResult Respond(Result result, string successMessage) =>
        Respond(result, () => Ok(new MessageResponse(true, successMessage)));

    protected IActionResult Respond(Result result, Func<IActionResult> onSuccess) =>
        result.IsSuccess ? onSuccess() : Problem(result.Error!);

    protected IActionResult Respond<T>(Result<T> result) =>
        Respond(result, value => Ok(value));

    protected IActionResult Respond<T>(Result<T> result, Func<T, IActionResult> onSuccess) =>
        result.IsSuccess ? onSuccess(result.Value) : Problem(result.Error!);

    private IActionResult Problem(Error error)
    {
        var body = new ErrorResponse(error.Message);
        return error.Type switch
        {
            ErrorType.NotFound => NotFound(body),
            ErrorType.Forbidden => StatusCode(StatusCodes.Status403Forbidden, body),
            _ => BadRequest(body)
        };
    }
}
