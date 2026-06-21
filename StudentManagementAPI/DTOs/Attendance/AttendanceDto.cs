namespace StudentManagementAPI.DTOs.Attendance;

public class AttendanceDto
{
    public int Id { get; set; }
    public string SchoolId { get; set; } = string.Empty;
    public string ClassId { get; set; } = string.Empty;
    public string StudentNo { get; set; } = string.Empty;
    public string? StudentName { get; set; }
    public DateOnly AttendanceDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? CreatedBy { get; set; }
}

public class MarkAttendanceDto
{
    public string StudentNo { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class BulkAttendanceRequest
{
    public string SchoolId { get; set; } = string.Empty;
    public string ClassId { get; set; } = string.Empty;
    public DateOnly AttendanceDate { get; set; }
    public List<MarkAttendanceDto> Records { get; set; } = [];
}

public class DashboardStatsDto
{
    public int TotalStudents { get; set; }
    public int TotalTeachers { get; set; }
    public int TotalSchools { get; set; }
    public int PresentToday { get; set; }
    public int AbsentToday { get; set; }
}
