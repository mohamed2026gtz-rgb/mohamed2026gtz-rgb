using StudentManagementAPI.DTOs.Students;
using StudentManagementAPI.Models;

namespace StudentManagementAPI.Helpers;

public static class TranscriptMapper
{
    public static EnrollmentHistoryDto ToChangeHistoryDto(StudentChangeHistory record) =>
        new()
        {
            Year = record.CreatedAt?.ToString("yyyy-MM-dd") ?? string.Empty,
            Class = record.FieldName,
            Section = record.ChangeType,
            Term1Total = record.OldValue,
            Term2Total = record.NewValue,
            Status = record.Notes
        };
}
