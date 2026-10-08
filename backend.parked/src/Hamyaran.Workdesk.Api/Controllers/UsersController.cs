using Hamyaran.Workdesk.Api.Auth;
using Hamyaran.Workdesk.Api.Data;
using Hamyaran.Workdesk.Api.DTOs;
using Hamyaran.Workdesk.Api.Middleware;
using Hamyaran.Workdesk.Api.Models;
using Hamyaran.Workdesk.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hamyaran.Workdesk.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher<object> _hasher;
    private readonly PermissionService _perms;
    private readonly AuditService _audit;

    public UsersController(AppDbContext db, IPasswordHasher<object> hasher,
        PermissionService perms, AuditService audit)
    {
        _db = db; _hasher = hasher; _perms = perms; _audit = audit;
    }

    [HttpGet]
    [RequirePermission(Perms.UsersView)]
    public async Task<ActionResult<List<UserDto>>> List()
    {
        var users = await _db.Users.Where(u => !u.IsDeleted)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .OrderBy(u => u.Name).ToListAsync();
        var out_ = new List<UserDto>();
        foreach (var u in users)
        {
            var role = u.UserRoles.FirstOrDefault()?.Role;
            out_.Add(Mappers.ToUserDto(u, role?.Name ?? "", role?.TitleFa ?? "",
                await _perms.ForUserAsync(u.Id), false));
        }
        return Ok(out_);
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Perms.UsersView)]
    public async Task<ActionResult<UserDto>> Get(Guid id)
    {
        var u = await _db.Users.Include(x => x.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (u is null) throw new ApiException("not_found", "کاربر یافت نشد.", 404);
        var role = u.UserRoles.FirstOrDefault()?.Role;
        return Ok(Mappers.ToUserDto(u, role?.Name ?? "", role?.TitleFa ?? "",
            await _perms.ForUserAsync(u.Id), false));
    }

    // No public signup: only authorized admins create users.
    [HttpPost]
    [RequirePermission(Perms.UsersCreate)]
    public async Task<ActionResult<UserDto>> Create([FromBody] CreateUserRequest req)
    {
        if (await _db.Users.AnyAsync(u => u.Username == req.Username || u.Email == req.Email))
            throw new ApiException("duplicate", "نام کاربری یا ایمیل تکراری است.", 409);
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == req.Role);
        if (role is null) throw new ApiException("invalid_role", "نقش نامعتبر است.", 400);

        var user = new User
        {
            Name = req.Name, Username = req.Username, Email = req.Email,
            Department = req.Department, Position = req.Position,
            Status = "active", ForcePasswordChange = true,
        };
        user.PasswordHash = _hasher.HashPassword(user, req.Password);
        _db.Users.Add(user);
        _db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User.UserId(), "user.create", "کاربر جدید ساخت", "user",
            entityId: user.Id, entityTitle: user.Name);
        return CreatedAtAction(nameof(Get), new { id = user.Id },
            Mappers.ToUserDto(user, role.Name, role.TitleFa, await _perms.ForUserAsync(user.Id), false));
    }

    [HttpPatch("{id:guid}")]
    [RequirePermission(Perms.UsersEdit)]
    public async Task<ActionResult<UserDto>> Update(Guid id, [FromBody] UpdateUserRequest req)
    {
        var u = await _db.Users.Include(x => x.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (u is null) throw new ApiException("not_found", "کاربر یافت نشد.", 404);
        if (req.Name is not null) u.Name = req.Name;
        if (req.Department is not null) u.Department = req.Department;
        if (req.Position is not null) u.Position = req.Position;
        if (req.Status is not null)
        {
            if (req.Status == "disabled" && !User.HasClaim("perm", Perms.UsersDisable))
                throw new ApiException("forbidden", "دسترسی غیرفعال‌سازی ندارید.", 403);
            u.Status = req.Status;
        }
        if (req.ForcePasswordChange is not null) u.ForcePasswordChange = req.ForcePasswordChange.Value;
        if (req.Role is not null)
        {
            var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == req.Role);
            if (role is null) throw new ApiException("invalid_role", "نقش نامعتبر است.", 400);
            _db.UserRoles.RemoveRange(u.UserRoles);
            _db.UserRoles.Add(new UserRole { UserId = u.Id, RoleId = role.Id });
        }
        await _db.SaveChangesAsync();
        return await Get(id);
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class RolesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AuditService _audit;
    public RolesController(AppDbContext db, AuditService audit) { _db = db; _audit = audit; }

    [HttpGet]
    [RequirePermission(Perms.UsersView)]
    public async Task<ActionResult<List<RoleDto>>> List()
    {
        var roles = await _db.Roles.Include(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .Include(r => r.UserRoles).ToListAsync();
        return Ok(roles.Select(r => new RoleDto(r.Id, r.Name, r.TitleFa,
            r.RolePermissions.Select(rp => rp.Permission.Key).ToList(), r.UserRoles.Count)).ToList());
    }

    [HttpPut("{id:guid}/permissions")]
    [RequirePermission(Perms.RolesManage)]
    public async Task<ActionResult<RoleDto>> UpdatePermissions(Guid id, [FromBody] UpdateRoleRequest req)
    {
        var role = await _db.Roles.Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (role is null) throw new ApiException("not_found", "نقش یافت نشد.", 404);
        var valid = await _db.Permissions.Where(p => req.Permissions.Contains(p.Key)).ToListAsync();
        _db.RolePermissions.RemoveRange(role.RolePermissions);
        foreach (var p in valid)
            _db.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = p.Id });
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User.UserId(), "role.update", "دسترسی‌های نقش را تغییر داد", "role",
            entityId: role.Id, entityTitle: role.TitleFa);
        return Ok(new RoleDto(role.Id, role.Name, role.TitleFa,
            valid.Select(p => p.Key).ToList(), await _db.UserRoles.CountAsync(ur => ur.RoleId == role.Id)));
    }
}
