namespace StudentManagementAPI.DTOs.Students;

public class StudentDto
{
    public int Auto { get; set; }
    public string StudentNo { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? SecondName { get; set; }
    public string? ThirdName { get; set; }
    public string? ForthName { get; set; }
    public string? FullName { get; set; }
    public string? Sex { get; set; }
    public string? YearOfBirth { get; set; }
    public string? StudentTell { get; set; }
    public string? StudentAddress { get; set; }
    public int? SchoolId { get; set; }
    public string? ClassId { get; set; }
    public string? Section { get; set; }
    public string? UniqueIds { get; set; }
    public bool? Disability { get; set; }
    public string? Status { get; set; }
}

public class StudentCreateDto
{
    public string StudentNo { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? SecondName { get; set; }
    public string? ThirdName { get; set; }
    public string? ForthName { get; set; }
    public string? Sex { get; set; }
    public string? YearOfBirth { get; set; }
    public string? StudentTell { get; set; }
    public string? StudentAddress { get; set; }
    public int? SchoolId { get; set; }
    public string? ClassId { get; set; }
    public string? Section { get; set; }
}

public class StudentUpdateDto
{
    public string? FirstName { get; set; }
    public string? SecondName { get; set; }
    public string? ThirdName { get; set; }
    public string? ForthName { get; set; }
    public string? Sex { get; set; }
    public string? YearOfBirth { get; set; }
    public string? StudentTell { get; set; }
    public string? StudentAddress { get; set; }
    public string? ClassId { get; set; }
    public string? Section { get; set; }
}
