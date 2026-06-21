namespace StudentManagementAPI.Services;

public interface IJwtTokenService
{
    (string Token, DateTime ExpiresAt) GenerateToken(
        string userId,
        string? userName,
        string? fullName,
        ulong? groupId,
        int? schoolId,
        IEnumerable<string> roles);
}
