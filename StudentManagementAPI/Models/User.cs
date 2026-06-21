using System;
using System.Collections.Generic;

namespace StudentManagementAPI.Models;

public partial class User
{
    public ulong Id { get; set; }

    public string Name { get; set; } = null!;

    public string Email { get; set; } = null!;

    public DateTime? EmailVerifiedAt { get; set; }

    public string Password { get; set; } = null!;

    public string? EmployeeId { get; set; }

    public string? Phone { get; set; }

    public string Status { get; set; } = null!;

    public bool MustChangePassword { get; set; }

    public DateTime? PasswordChangedAt { get; set; }

    public ulong? GroupId { get; set; }

    public string? RememberToken { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public DateTime? DeletedAt { get; set; }

    public virtual ICollection<StudentChangeHistory> StudentChangeHistories { get; set; } = new List<StudentChangeHistory>();
}
