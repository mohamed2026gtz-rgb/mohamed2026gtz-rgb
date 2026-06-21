using StudentManagementAPI.DTOs.Auth;

namespace StudentManagementAPI.Services;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request);
    Task<UserProfileDto?> GetProfileAsync(string userId);
}
