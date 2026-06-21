using StudentManagementAPI.DTOs.Students;
using StudentManagementAPI.Models;

namespace StudentManagementAPI.Helpers;

public static class StudentMapper
{
    public static StudentDto ToDto(StudentsManagement student) => new()
    {
        Auto = (int)student.Id,
        StudentNo = student.UniqueId,
        FullName = student.StudentName,
        Sex = student.Sex,
        YearOfBirth = student.DateOfBirth?.ToString("yyyy-MM-dd"),
        StudentTell = student.Telephone,
        StudentAddress = student.Location,
        SchoolId = (int)student.SchoolId,
        ClassId = student.ClassId,
        UniqueIds = student.UniqueId,
        Status = student.Status
    };
}
