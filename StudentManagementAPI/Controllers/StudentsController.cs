using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementAPI.Data;
using StudentManagementAPI.DTOs.Common;
using StudentManagementAPI.DTOs.Students;
using StudentManagementAPI.Helpers;
using StudentManagementAPI.Models;

namespace StudentManagementAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class StudentsController(NewschemaDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<StudentDto>>> GetStudents(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? classId = null,
        [FromQuery] int? schoolId = null,
        [FromQuery] bool searchAllSchools = false)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var isAdmin = User.IsAdmin();
        var crossSchoolSearch = isAdmin && searchAllSchools && !string.IsNullOrWhiteSpace(search);

        var query = context.StudentsManagements
            .AsNoTracking()
            .Where(s => s.DeletedAt == null);

        if (!crossSchoolSearch)
            query = await UserSchoolAccess.ApplyStudentScopeAsync(context, User, query);

        if (!crossSchoolSearch && schoolId.HasValue)
            query = query.Where(s => s.SchoolId == (ulong)schoolId.Value);

        if (!string.IsNullOrWhiteSpace(classId))
            query = query.Where(s => s.ClassId == classId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            if (crossSchoolSearch)
            {
                query = query.Where(s => s.UniqueId == search);
            }
            else
            {
                query = query.Where(s =>
                    s.UniqueId.Contains(search) ||
                    (s.StudentNo != null && s.StudentNo.Contains(search)) ||
                    s.StudentName.Contains(search));
            }
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderBy(s => s.StudentName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResult<StudentDto>
        {
            Items = items.Select(StudentMapper.ToDto).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }

    [HttpGet("{studentNo}")]
    public async Task<ActionResult<StudentDto>> GetStudent(string studentNo)
    {
        var student = await FindStudentAsync(studentNo);
        if (student is null)
            return NotFound();

        return Ok(StudentMapper.ToDto(student));
    }

    [HttpGet("{studentNo}/transcript")]
    public async Task<ActionResult<StudentTranscriptDto>> GetStudentTranscript(string studentNo)
    {
        var student = await FindStudentAsync(studentNo);
        if (student is null)
            return NotFound();

        var changeHistory = await context.StudentChangeHistories
            .AsNoTracking()
            .Where(h => h.StudentUniqueId == student.UniqueId)
            .OrderByDescending(h => h.CreatedAt)
            .ToListAsync();

        var dto = StudentMapper.ToDto(student);
        return Ok(new StudentTranscriptDto
        {
            StudentNo = student.UniqueId,
            StudentName = dto.FullName,
            SchoolId = (int)student.SchoolId,
            ClassId = student.ClassId,
            EnrollmentHistory = changeHistory.Select(TranscriptMapper.ToChangeHistoryDto).ToList()
        });
    }

    [HttpPost]
    public Task<ActionResult<StudentDto>> CreateStudent([FromBody] StudentCreateDto dto) =>
        Task.FromResult<ActionResult<StudentDto>>(
            StatusCode(501, new { message = "Create student is not enabled for NEWSCHEMA via mobile API." }));

    [HttpPut("{studentNo}")]
    public Task<ActionResult<StudentDto>> UpdateStudent(string studentNo, [FromBody] StudentUpdateDto dto) =>
        Task.FromResult<ActionResult<StudentDto>>(
            StatusCode(501, new { message = "Update student is not enabled for NEWSCHEMA via mobile API." }));

    [HttpDelete("{studentNo}")]
    public Task<IActionResult> DeleteStudent(string studentNo) =>
        Task.FromResult<IActionResult>(
            StatusCode(501, new { message = "Delete student is not enabled for NEWSCHEMA via mobile API." }));

    private async Task<StudentsManagement?> FindStudentAsync(string uniqueId, bool tracked = false)
    {
        var query = tracked
            ? context.StudentsManagements.AsQueryable()
            : context.StudentsManagements.AsNoTracking();

        var student = await query.FirstOrDefaultAsync(s =>
            s.UniqueId == uniqueId && s.DeletedAt == null);

        if (student is null)
            return null;

        if (!User.IsAdmin())
        {
            var allowed = await UserSchoolAccess.CanAccessSchoolAsync(context, User, student.SchoolNumber);
            if (!allowed)
                return null;
        }

        return student;
    }
}
