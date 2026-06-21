using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using StudentManagementAPI.Data;
using StudentManagementAPI.Models;

namespace StudentManagementAPI.Helpers;

public static class UserSchoolAccess
{
    public static async Task<List<string>?> GetAllowedSchoolNumbersAsync(
        NewschemaDbContext context,
        ClaimsPrincipal user)
    {
        if (user.IsAdmin())
            return null;

        var groupId = user.GetGroupId();
        if (!groupId.HasValue)
            return null;

        return await context.GroupSchoolAssignments
            .AsNoTracking()
            .Where(g => g.GroupId == groupId.Value)
            .Select(g => g.SchoolNumber)
            .ToListAsync();
    }

    public static async Task<IQueryable<StudentsManagement>> ApplyStudentScopeAsync(
        NewschemaDbContext context,
        ClaimsPrincipal user,
        IQueryable<StudentsManagement> query)
    {
        var schoolNumbers = await GetAllowedSchoolNumbersAsync(context, user);
        if (schoolNumbers is { Count: > 0 })
            query = query.Where(s => schoolNumbers.Contains(s.SchoolNumber));

        return query;
    }

    public static async Task<IQueryable<SchoolsManagement>> ApplySchoolScopeAsync(
        NewschemaDbContext context,
        ClaimsPrincipal user,
        IQueryable<SchoolsManagement> query)
    {
        var schoolNumbers = await GetAllowedSchoolNumbersAsync(context, user);
        if (schoolNumbers is { Count: > 0 })
            query = query.Where(s => schoolNumbers.Contains(s.SchoolNumber));

        return query;
    }

    public static async Task<bool> CanAccessSchoolAsync(
        NewschemaDbContext context,
        ClaimsPrincipal user,
        string schoolNumber)
    {
        if (user.IsAdmin())
            return true;

        var schoolNumbers = await GetAllowedSchoolNumbersAsync(context, user);
        return schoolNumbers is null || schoolNumbers.Contains(schoolNumber);
    }
}
