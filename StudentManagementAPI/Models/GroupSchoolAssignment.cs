using System;
using System.Collections.Generic;

namespace StudentManagementAPI.Models;

public partial class GroupSchoolAssignment
{
    public ulong Id { get; set; }

    public ulong GroupId { get; set; }

    public string SchoolNumber { get; set; } = null!;

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual SchoolsManagement SchoolNumberNavigation { get; set; } = null!;
}
