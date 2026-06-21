using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementAPI.Data;
using StudentManagementAPI.DTOs.Regions;

namespace StudentManagementAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class RegionsController(NewschemaDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<RegionDto>>> GetRegions([FromQuery] string? search = null)
    {
        var query = context.Regions.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(r => r.RegionName.Contains(search));

        var regions = await query
            .OrderBy(r => r.RegionName)
            .Select(r => new RegionDto
            {
                Auto = (int)r.RegionId,
                Name = r.RegionName,
                Tell = r.RegionCode
            })
            .ToListAsync();

        return Ok(regions);
    }

    [HttpGet("{id:int}/districts")]
    public async Task<ActionResult<List<DistrictDto>>> GetDistricts(int id, [FromQuery] string? search = null)
    {
        var regionExists = await context.Regions.AsNoTracking()
            .AnyAsync(r => r.RegionId == (ulong)id);
        if (!regionExists)
            return NotFound();

        var query = context.Districts.AsNoTracking()
            .Where(d => d.RegionId == (ulong)id);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(d => d.DistrictName.Contains(search));

        var districts = await query
            .OrderBy(d => d.DistrictName)
            .Select(d => new DistrictDto
            {
                Auto = (int)d.DistrictId,
                Name = d.DistrictName,
                Region = d.RegionId.ToString()
            })
            .ToListAsync();

        return Ok(districts);
    }
}
