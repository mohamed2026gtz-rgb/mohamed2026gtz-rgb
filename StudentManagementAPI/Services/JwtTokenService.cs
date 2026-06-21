using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace StudentManagementAPI.Services;

public class JwtTokenService(IConfiguration configuration) : IJwtTokenService
{
    public (string Token, DateTime ExpiresAt) GenerateToken(
        string userId,
        string? userName,
        string? fullName,
        ulong? groupId,
        int? schoolId,
        IEnumerable<string> roles)
    {
        var jwtSettings = configuration.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expireMinutes = int.Parse(jwtSettings["ExpireMinutes"] ?? "60");
        var expiresAt = DateTime.UtcNow.AddMinutes(expireMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.NameIdentifier, userId),
            new(ClaimTypes.Name, userName ?? userId)
        };

        if (!string.IsNullOrWhiteSpace(fullName))
            claims.Add(new Claim("fullName", fullName));

        if (groupId.HasValue)
            claims.Add(new Claim("groupId", groupId.Value.ToString()));

        if (schoolId.HasValue)
            claims.Add(new Claim("schoolId", schoolId.Value.ToString()));

        foreach (var role in roles)
            claims.Add(new Claim(ClaimTypes.Role, role));

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
