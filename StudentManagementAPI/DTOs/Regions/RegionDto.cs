namespace StudentManagementAPI.DTOs.Regions;

public class RegionDto
{
    public int Auto { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Reo { get; set; }
    public string? Tell { get; set; }
    public string? Email { get; set; }
}

public class DistrictDto
{
    public int Auto { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Region { get; set; }
    public string? Deo { get; set; }
    public string? Tell { get; set; }
    public string? Email { get; set; }
}
