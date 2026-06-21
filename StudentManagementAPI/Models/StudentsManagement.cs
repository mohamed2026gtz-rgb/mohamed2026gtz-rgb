using System;
using System.Collections.Generic;

namespace StudentManagementAPI.Models;

public partial class StudentsManagement
{
    public ulong Id { get; set; }

    /// <summary>
    /// Uniqueid: Unique student identifier (e.g., 19-906528)
    /// </summary>
    public string UniqueId { get; set; } = null!;

    /// <summary>
    /// StudentNo: Student number (e.g., 2045375)
    /// </summary>
    public string? StudentNo { get; set; }

    public string? IdCardSerial { get; set; }

    /// <summary>
    /// FullName: Full name of the student
    /// </summary>
    public string StudentName { get; set; } = null!;

    public string? EnglishName { get; set; }

    /// <summary>
    /// Mother Name: Name of student&apos;s mother
    /// </summary>
    public string? MNam { get; set; }

    /// <summary>
    /// Schoolid: School identifier (e.g., 7453)
    /// </summary>
    public string SchoolNumber { get; set; } = null!;

    public ulong SchoolId { get; set; }

    public string SchoolName { get; set; } = null!;

    public string? Ownership { get; set; }

    public ulong? RegionId { get; set; }

    public string Region { get; set; } = null!;

    public string? District { get; set; }

    public string? HeadTeacher { get; set; }

    public string? Telephone { get; set; }

    public string? EmergencyContactName { get; set; }

    public string? EmergencyContactPhone { get; set; }

    public string? Location { get; set; }

    /// <summary>
    /// Student sex: M (Male), F (Female), or other values
    /// </summary>
    public string? Sex { get; set; }

    public DateOnly? DateOfBirth { get; set; }

    public string? Level { get; set; }

    /// <summary>
    /// AccYear: Academic year (e.g., 2025/2026)
    /// </summary>
    public string? AccYear { get; set; }

    /// <summary>
    /// ClassID: Class identifier (e.g., 8A)
    /// </summary>
    public string? ClassId { get; set; }

    public string? ImageName { get; set; }

    public string? ImageUrl { get; set; }

    public string Status { get; set; } = null!;

    public string? CollectedStatus { get; set; }

    public string ImageStatus { get; set; } = null!;

    public string? DocumentName { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public DateTime? DeletedAt { get; set; }

    public string? RemovalReason { get; set; }

    public virtual Region? RegionNavigation { get; set; }

    public virtual SchoolsManagement School { get; set; } = null!;

    public virtual ICollection<StudentChangeHistory> StudentChangeHistories { get; set; } = new List<StudentChangeHistory>();
}
