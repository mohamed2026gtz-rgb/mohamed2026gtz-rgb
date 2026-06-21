using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudentManagementAPI.DTOs.Auth;
using StudentManagementAPI.Helpers;
using StudentManagementAPI.Services;

namespace StudentManagementAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var response = await authService.LoginAsync(request);
        if (response is null)
            return Unauthorized(new { message = "Invalid username or password." });

        return Ok(response);
    }

    [HttpGet("profile")]
    [Authorize]
    public async Task<ActionResult<UserProfileDto>> GetProfile()
    {
        var profile = await authService.GetProfileAsync(User.GetUserId());
        if (profile is null)
            return NotFound();

        return Ok(profile);
    }
}
