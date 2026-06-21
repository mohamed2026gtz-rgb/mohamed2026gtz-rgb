using System;
using System.Collections.Generic;

namespace StudentManagementAPI.Models;

public partial class District
{
    public ulong DistrictId { get; set; }

    public string DistrictName { get; set; } = null!;

    public ulong RegionId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Region Region { get; set; } = null!;
}
