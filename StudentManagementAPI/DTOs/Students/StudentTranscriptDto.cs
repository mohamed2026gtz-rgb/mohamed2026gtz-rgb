namespace StudentManagementAPI.DTOs.Students;

public class StudentTranscriptDto
{
    public string StudentNo { get; set; } = string.Empty;

    public string? StudentName { get; set; }

    public int? SchoolId { get; set; }

    public string? ClassId { get; set; }

    public List<TranscriptTermDto> PrimaryRecords { get; set; } = [];

    public List<TranscriptTermDto> SecondaryRecords { get; set; } = [];

    public List<EnrollmentHistoryDto> EnrollmentHistory { get; set; } = [];
}

public class TranscriptTermDto
{
    public string Year { get; set; } = string.Empty;

    public string? Term { get; set; }

    public string? ClassId { get; set; }

    public string? Section { get; set; }

    public List<SubjectGradeDto> Grades { get; set; } = [];

    public string? Total { get; set; }
}

public class SubjectGradeDto
{
    public string Subject { get; set; } = string.Empty;

    public string? Score { get; set; }
}

public class EnrollmentHistoryDto
{
    public string Year { get; set; } = string.Empty;

    public string? Class { get; set; }

    public string? Section { get; set; }

    public string? Term1Total { get; set; }

    public string? Term2Total { get; set; }

    public string? YearTotal { get; set; }

    public string? Status { get; set; }
}
