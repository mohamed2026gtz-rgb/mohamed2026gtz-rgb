using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementAPI.Data;
using StudentManagementAPI.DTOs.Common;
using StudentManagementAPI.DTOs.Teachers;
using StudentManagementAPI.Helpers;

namespace StudentManagementAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class TeachersController(NewschemaDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<TeacherDto>>> GetTeachers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] int? schoolId = null)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = context.SchoolsManagements.AsNoTracking()
            .Where(s => s.HeadTeacher != null && s.HeadTeacher != "");

        query = await UserSchoolAccess.ApplySchoolScopeAsync(context, User, query);

        if (schoolId.HasValue)
            query = query.Where(s => s.SchoolId == (ulong)schoolId.Value);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(s => s.HeadTeacher!.Contains(search));

        var grouped = query
            .GroupBy(s => s.HeadTeacher!)
            .Select(g => new TeacherDto
            {
                Auto = (int)g.Min(x => x.SchoolId),
                SchoolId = g.Min(x => x.SchoolId).ToString(),
                FullName = g.Key,
                Title = "Head Teacher",
                Telephone = g.Select(x => x.Telephone).FirstOrDefault()
            });

        var totalCount = await grouped.CountAsync();
        var items = await grouped
            .OrderBy(t => t.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResult<TeacherDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TeacherDto>> GetTeacher(int id)
    {
        var school = await context.SchoolsManagements.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SchoolId == (ulong)id);

        if (school is null || string.IsNullOrWhiteSpace(school.HeadTeacher))
            return NotFound();

        if (!User.IsAdmin())
        {
            var allowed = await UserSchoolAccess.CanAccessSchoolAsync(context, User, school.SchoolNumber);
            if (!allowed)
                return Forbid();
        }

        return Ok(new TeacherDto
        {
            Auto = (int)school.SchoolId,
            SchoolId = school.SchoolId.ToString(),
            FullName = school.HeadTeacher,
            Title = "Head Teacher",
            Telephone = school.Telephone
        });
    }
}
