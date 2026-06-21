using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementAPI.Data;
using StudentManagementAPI.DTOs.Attendance;
using StudentManagementAPI.Helpers;

namespace StudentManagementAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class DashboardController(NewschemaDbContext context) : ControllerBase
{
    [HttpGet("stats")]
    public async Task<ActionResult<DashboardStatsDto>> GetStats([FromQuery] int? schoolId = null)
    {
        var studentsQuery = context.StudentsManagements.AsNoTracking()
            .Where(s => s.DeletedAt == null);
        studentsQuery = await UserSchoolAccess.ApplyStudentScopeAsync(context, User, studentsQuery);

        var schoolsQuery = context.SchoolsManagements.AsNoTracking().AsQueryable();
        schoolsQuery = await UserSchoolAccess.ApplySchoolScopeAsync(context, User, schoolsQuery);

        if (schoolId.HasValue)
        {
            studentsQuery = studentsQuery.Where(s => s.SchoolId == (ulong)schoolId.Value);
            schoolsQuery = schoolsQuery.Where(s => s.SchoolId == (ulong)schoolId.Value);
        }

        var totalTeachers = await schoolsQuery
            .Where(s => s.HeadTeacher != null && s.HeadTeacher != "")
            .Select(s => s.HeadTeacher)
            .Distinct()
            .CountAsync();

        return Ok(new DashboardStatsDto
        {
            TotalStudents = await studentsQuery.CountAsync(),
            TotalTeachers = totalTeachers,
            TotalSchools = await schoolsQuery.CountAsync(),
            PresentToday = 0,
            AbsentToday = 0
        });
    }
}
