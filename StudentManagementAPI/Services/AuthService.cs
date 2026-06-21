using Microsoft.EntityFrameworkCore;
using StudentManagementAPI.Data;
using StudentManagementAPI.DTOs.Auth;

namespace StudentManagementAPI.Services;

public class AuthService(NewschemaDbContext context, IJwtTokenService jwtTokenService) : IAuthService
{
    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var login = request.Username.Trim();
        var user = await context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u =>
                u.Email == login ||
                u.Email.ToLower() == login.ToLower());

        if (user is null || user.DeletedAt is not null)
            return null;

        if (!string.Equals(user.Status, "active", StringComparison.OrdinalIgnoreCase))
            return null;

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
            return null;

        var roles = await (
            from userRole in context.ModelHasRoles.AsNoTracking()
            join role in context.Roles.AsNoTracking() on userRole.RoleId equals role.Id
            where userRole.ModelId == user.Id &&
                  userRole.ModelType.Contains("User")
            select role.Name
        ).ToListAsync();

        int? sampleSchoolId = null;
        if (user.GroupId.HasValue)
        {
            var schoolNumber = await context.GroupSchoolAssignments
                .AsNoTracking()
                .Where(g => g.GroupId == user.GroupId.Value)
                .Select(g => g.SchoolNumber)
                .FirstOrDefaultAsync();

            if (schoolNumber is not null)
            {
                var school = await context.SchoolsManagements
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.SchoolNumber == schoolNumber);
                if (school is not null)
                    sampleSchoolId = (int)school.SchoolId;
            }
        }

        var profile = new UserProfileDto
        {
            Id = user.Id.ToString(),
            FullName = user.Name,
            Email = user.Email,
            UserName = user.Email,
            SchoolId = sampleSchoolId,
            Roles = roles
        };

        var (token, expiresAt) = jwtTokenService.GenerateToken(
            user.Id.ToString(),
            user.Email,
            user.Name,
            user.GroupId,
            sampleSchoolId,
            roles);

        return new LoginResponse
        {
            Token = token,
            ExpiresAt = expiresAt,
            User = profile
        };
    }

    public async Task<UserProfileDto?> GetProfileAsync(string userId)
    {
        if (!ulong.TryParse(userId, out var id))
            return null;

        var user = await context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
        if (user is null || user.DeletedAt is not null)
            return null;

        var roles = await (
            from userRole in context.ModelHasRoles.AsNoTracking()
            join role in context.Roles.AsNoTracking() on userRole.RoleId equals role.Id
            where userRole.ModelId == user.Id &&
                  userRole.ModelType.Contains("User")
            select role.Name
        ).ToListAsync();

        int? sampleSchoolId = null;
        if (user.GroupId.HasValue)
        {
            var schoolNumber = await context.GroupSchoolAssignments
                .AsNoTracking()
                .Where(g => g.GroupId == user.GroupId.Value)
                .Select(g => g.SchoolNumber)
                .FirstOrDefaultAsync();

            if (schoolNumber is not null)
            {
                var school = await context.SchoolsManagements
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.SchoolNumber == schoolNumber);
                if (school is not null)
                    sampleSchoolId = (int)school.SchoolId;
            }
        }

        return new UserProfileDto
        {
            Id = user.Id.ToString(),
            FullName = user.Name,
            Email = user.Email,
            UserName = user.Email,
            SchoolId = sampleSchoolId,
            Roles = roles
        };
    }
}
