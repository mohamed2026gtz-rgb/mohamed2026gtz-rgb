using System.Net;
using System.Text.Json;

namespace StudentManagementAPI.Middleware;

public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);
            await WriteErrorResponseAsync(context, HttpStatusCode.InternalServerError,
                "An unexpected error occurred. Please try again later.");
        }
    }

    private static async Task WriteErrorResponseAsync(HttpContext context, HttpStatusCode statusCode, string message)
    {
        if (context.Response.HasStarted)
            return;

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;
        await context.Response.WriteAsync(JsonSerializer.Serialize(new { message }));
    }
}
