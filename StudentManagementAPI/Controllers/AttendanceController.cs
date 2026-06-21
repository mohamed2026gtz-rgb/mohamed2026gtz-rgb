using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudentManagementAPI.DTOs.Attendance;

namespace StudentManagementAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class AttendanceController : ControllerBase
{
    [HttpGet]
    public ActionResult<List<AttendanceDto>> GetAttendance() => Ok(new List<AttendanceDto>());

    [HttpPost("bulk")]
    public ActionResult<List<AttendanceDto>> MarkBulkAttendance([FromBody] BulkAttendanceRequest request) =>
        StatusCode(501, new { message = "Attendance is not available in NEWSCHEMA yet." });
}
