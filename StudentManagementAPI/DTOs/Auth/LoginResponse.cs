namespace StudentManagementAPI.DTOs.Auth;

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public UserProfileDto User { get; set; } = new();
}

public class UserProfileDto
{
    public string Id { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? UserName { get; set; }
    public int? SchoolId { get; set; }
    public int? RegionId { get; set; }
    public int? DistrictId { get; set; }
    public List<string> Roles { get; set; } = [];
}
