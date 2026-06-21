namespace StudentManagementAPI.DTOs.Schools;

public class SchoolDto
{
    public int SchoolId { get; set; }
    public string SchoolName { get; set; } = string.Empty;
    public string? Region { get; set; }
    public string? District { get; set; }
    public bool? IsActive { get; set; }
}

public class SchoolClassDto
{
    public int Auto { get; set; }
    public int? SchoolId { get; set; }
    public string? ClassId { get; set; }
    public string? Section { get; set; }
    public string? Shift { get; set; }
    public string? Year { get; set; }
}
