using System.Security.Claims;

namespace StudentManagementAPI.Helpers;

public static class ClaimsPrincipalExtensions
{
    private static readonly HashSet<string> AdminRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "System Admin",
        "Supervisor",
        "Manager",
        "Admin",
        "Administrator"
    };

    public static string GetUserId(this ClaimsPrincipal user) =>
        user.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;

    public static ulong? GetGroupId(this ClaimsPrincipal user)
    {
        var value = user.FindFirstValue("groupId");
        return ulong.TryParse(value, out var groupId) ? groupId : null;
    }

    public static int? GetSchoolId(this ClaimsPrincipal user)
    {
        var value = user.FindFirstValue("schoolId");
        return int.TryParse(value, out var schoolId) ? schoolId : null;
    }

    public static bool IsAdmin(this ClaimsPrincipal user) =>
        user.FindAll(ClaimTypes.Role).Any(role => AdminRoles.Contains(role.Value));
}
