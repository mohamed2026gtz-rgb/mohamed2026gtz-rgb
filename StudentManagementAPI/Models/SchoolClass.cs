using System;
using System.Collections.Generic;

namespace StudentManagementAPI.Models;

public partial class SchoolClass
{
    public ulong Id { get; set; }

    /// <summary>
    /// Matches students_management.class_id
    /// </summary>
    public string ClassCode { get; set; } = null!;

    public string ClassName { get; set; } = null!;

    public ulong? SchoolId { get; set; }

    public string? SchoolNumber { get; set; }

    public string? GradeLevel { get; set; }

    public string? AcademicYear { get; set; }

    public bool? IsActive { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
