using System;
using System.Collections.Generic;

namespace StudentManagementAPI.Models;

public partial class StudentChangeHistory
{
    public ulong Id { get; set; }

    public string StudentUniqueId { get; set; } = null!;

    public ulong ChangedByUserId { get; set; }

    public string FieldName { get; set; } = null!;

    public string? OldValue { get; set; }

    public string? NewValue { get; set; }

    public string ChangeType { get; set; } = null!;

    public string? Notes { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual User ChangedByUser { get; set; } = null!;

    public virtual StudentsManagement StudentUnique { get; set; } = null!;
}
