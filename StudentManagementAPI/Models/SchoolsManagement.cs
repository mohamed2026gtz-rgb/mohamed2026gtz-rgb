using System;
using System.Collections.Generic;

namespace StudentManagementAPI.Models;

public partial class SchoolsManagement
{
    public ulong SchoolId { get; set; }

    public string SchoolNumber { get; set; } = null!;

    public string SchoolName { get; set; } = null!;

    public string? ExamCenterName { get; set; }

    public ulong? RegionId { get; set; }

    public string? Region { get; set; }

    public string? District { get; set; }

    public string? HeadTeacher { get; set; }

    public string? Telephone { get; set; }

    public string? Location { get; set; }

    public string? SchoolLevel { get; set; }

    public string? Ownership { get; set; }

    public int TotalStudents { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<GroupSchoolAssignment> GroupSchoolAssignments { get; set; } = new List<GroupSchoolAssignment>();

    public virtual Region? RegionNavigation { get; set; }

    public virtual ICollection<StudentsManagement> StudentsManagements { get; set; } = new List<StudentsManagement>();
}
