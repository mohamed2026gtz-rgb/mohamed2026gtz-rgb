using System;
using System.Collections.Generic;

namespace StudentManagementAPI.Models;

public partial class Region
{
    public ulong RegionId { get; set; }

    public string RegionName { get; set; } = null!;

    public string? RegionCode { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<District> Districts { get; set; } = new List<District>();

    public virtual ICollection<SchoolsManagement> SchoolsManagements { get; set; } = new List<SchoolsManagement>();

    public virtual ICollection<StudentsManagement> StudentsManagements { get; set; } = new List<StudentsManagement>();
}
