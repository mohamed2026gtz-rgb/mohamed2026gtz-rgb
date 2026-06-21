using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementAPI.Data;
using StudentManagementAPI.DTOs.Schools;
using StudentManagementAPI.Helpers;

namespace StudentManagementAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class SchoolsController(NewschemaDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<SchoolDto>>> GetSchools([FromQuery] string? search = null)
    {
        var query = context.SchoolsManagements.AsNoTracking().AsQueryable();
        query = await UserSchoolAccess.ApplySchoolScopeAsync(context, User, query);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(s => s.SchoolName.Contains(search));

        var schools = await query
            .OrderBy(s => s.SchoolName)
            .Select(s => new SchoolDto
            {
                SchoolId = (int)s.SchoolId,
                SchoolName = s.SchoolName,
                Region = s.Region,
                District = s.District,
                IsActive = true
            })
            .ToListAsync();

        return Ok(schools);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SchoolDto>> GetSchool(int id)
    {
        var school = await context.SchoolsManagements.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SchoolId == (ulong)id);

        if (school is null)
            return NotFound();

        if (!User.IsAdmin())
        {
            var allowed = await UserSchoolAccess.CanAccessSchoolAsync(context, User, school.SchoolNumber);
            if (!allowed)
                return Forbid();
        }

        return Ok(new SchoolDto
        {
            SchoolId = (int)school.SchoolId,
            SchoolName = school.SchoolName,
            Region = school.Region,
            District = school.District,
            IsActive = true
        });
    }

    [HttpGet("{id:int}/classes")]
    public async Task<ActionResult<List<SchoolClassDto>>> GetSchoolClasses(int id)
    {
        var school = await context.SchoolsManagements.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SchoolId == (ulong)id);
        if (school is null)
            return NotFound();

        if (!User.IsAdmin())
        {
            var allowed = await UserSchoolAccess.CanAccessSchoolAsync(context, User, school.SchoolNumber);
            if (!allowed)
                return Forbid();
        }

        var classes = await context.SchoolClasses.AsNoTracking()
            .Where(c => c.SchoolId == (ulong)id || c.SchoolNumber == school.SchoolNumber)
            .OrderBy(c => c.ClassName)
            .Select(c => new SchoolClassDto
            {
                Auto = (int)c.Id,
                SchoolId = c.SchoolId.HasValue ? (int)c.SchoolId.Value : id,
                ClassId = c.ClassCode,
                Section = c.GradeLevel,
                Year = c.AcademicYear
            })
            .ToListAsync();

        return Ok(classes);
    }
}
