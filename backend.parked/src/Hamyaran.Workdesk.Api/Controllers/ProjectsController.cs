using Hamyaran.Workdesk.Api.Auth;
using Hamyaran.Workdesk.Api.Data;
using Hamyaran.Workdesk.Api.DTOs;
using Hamyaran.Workdesk.Api.Middleware;
using Hamyaran.Workdesk.Api.Models;
using Hamyaran.Workdesk.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hamyaran.Workdesk.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class ProjectsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly PermissionService _perms;
    private readonly AuditService _audit;

    public ProjectsController(AppDbContext db, PermissionService perms, AuditService audit)
    {
        _db = db; _perms = perms; _audit = audit;
    }

    private async Task<ProjectDto> ToDtoAsync(Project p)
    {
        var tasks = await _db.Tasks.Where(t => t.ProjectId == p.Id && !t.IsArchived).ToListAsync();
        var done = tasks.Count(t => t.Status is "done" or "released");
        var now = DateTime.UtcNow;
        return Mappers.ToProjectDto(p,
            tasks.Count == 0 ? 0 : done * 100 / tasks.Count,
            await _db.ProjectMembers.CountAsync(m => m.ProjectId == p.Id),
            tasks.Count(t => t.Status is not ("done" or "released")),
            tasks.Count(t => t.DueDate < now && t.Status is not ("done" or "released")),
            tasks.Count(t => t.IsBlocked),
            false);
    }

    [HttpGet]
    [RequirePermission(Perms.ProjectsView)]
    public async Task<ActionResult<List<ProjectDto>>> List()
    {
        var uid = User.UserId();
        // Only projects the user is a member of (plus all for admins w/ manage).
        var memberIds = await _db.ProjectMembers.Where(m => m.UserId == uid)
            .Select(m => m.ProjectId).ToListAsync();
        var projects = await _db.Projects
            .Where(p => !p.IsDeleted && memberIds.Contains(p.Id))
            .OrderByDescending(p => p.LastActivityAt).ToListAsync();
        var out_ = new List<ProjectDto>();
        foreach (var p in projects) out_.Add(await ToDtoAsync(p));
        return Ok(out_);
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Perms.ProjectsView)]
    public async Task<ActionResult<ProjectDto>> Get(Guid id)
    {
        var p = await _db.Projects.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (p is null) throw new ApiException("not_found", "پروژه یافت نشد.", 404);
        if (!await _perms.IsProjectMemberAsync(User.UserId(), id))
            throw new ApiException("forbidden", "عضو این پروژه نیستید.", 403);
        return Ok(await ToDtoAsync(p));
    }

    [HttpPost]
    [RequirePermission(Perms.ProjectsCreate)]
    public async Task<ActionResult<ProjectDto>> Create([FromBody] CreateProjectRequest req)
    {
        var uid = User.UserId();
        var p = new Project
        {
            Name = req.Name, Key = req.Key.ToUpperInvariant()[..Math.Min(5, req.Key.Length)],
            Description = req.Description ?? "", Status = "active", Health = "on_track",
            OwnerId = uid, TargetDate = req.TargetDate ?? DateTime.UtcNow.AddDays(90),
        };
        _db.Projects.Add(p);
        _db.ProjectMembers.Add(new ProjectMember { ProjectId = p.Id, UserId = uid, RoleInProject = "مدیر پروژه" });

        Board Mk(string name, string kind, bool def, (string, string, string)[] cols)
        {
            var b = new Board { ProjectId = p.Id, Name = name, Kind = kind, IsDefault = def };
            var i = 0;
            foreach (var (title, key, color) in cols)
                b.Columns.Add(new BoardColumn
                {
                    Title = title, Key = key, Color = color, Order = i++,
                    IsDoneColumn = key is "done" or "released",
                });
            return b;
        }
        _db.Boards.Add(Mk("توسعه اصلی", "main", true,
            [("بک‌لاگ", "backlog", "#64748b"), ("برنامه‌ریزی‌شده", "planned", "#0ea5e9"),
             ("در حال انجام", "in_progress", "#8b5cf6"), ("بازبینی", "review", "#f59e0b"),
             ("تست", "testing", "#ec4899"), ("انجام‌شده", "done", "#16a34a")]));
        _db.Boards.Add(Mk("فوری / هات‌فیکس", "urgent", false,
            [("جدید", "new", "#dc2626"), ("در حال بررسی", "investigating", "#f59e0b"),
             ("در حال رفع", "fixing", "#8b5cf6"), ("راستی‌آزمایی", "verification", "#0ea5e9"),
             ("منتشرشده", "released", "#16a34a")]));
        await _db.SaveChangesAsync();
        await _audit.LogAsync(uid, "project.create", "پروژه جدید ساخت", "project",
            p.Id, p.Id, p.Name);
        return CreatedAtAction(nameof(Get), new { id = p.Id }, await ToDtoAsync(p));
    }

    [HttpPatch("{id:guid}")]
    [RequirePermission(Perms.ProjectsEdit)]
    public async Task<ActionResult<ProjectDto>> Update(Guid id, [FromBody] UpdateProjectRequest req)
    {
        var p = await _db.Projects.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (p is null) throw new ApiException("not_found", "پروژه یافت نشد.", 404);
        if (!await _perms.IsProjectMemberAsync(User.UserId(), id))
            throw new ApiException("forbidden", "عضو این پروژه نیستید.", 403);
        if (req.Name is not null) p.Name = req.Name;
        if (req.Key is not null) p.Key = req.Key;
        if (req.Description is not null) p.Description = req.Description;
        if (req.IconColor is not null) p.IconColor = req.IconColor;
        if (req.Status is not null) p.Status = req.Status;
        if (req.Health is not null) p.Health = req.Health;
        if (req.TargetDate is not null) p.TargetDate = req.TargetDate.Value;
        p.LastActivityAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(await ToDtoAsync(p));
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(Perms.ProjectsDelete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var p = await _db.Projects.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (p is null) throw new ApiException("not_found", "پروژه یافت نشد.", 404);
        p.IsDeleted = true;
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User.UserId(), "project.delete", "پروژه را حذف کرد", "project",
            id, id, p.Name);
        return NoContent();
    }

    [HttpGet("{id:guid}/members")]
    [RequirePermission(Perms.ProjectsView)]
    public async Task<ActionResult<List<ProjectMemberDto>>> Members(Guid id)
    {
        if (!await _perms.IsProjectMemberAsync(User.UserId(), id))
            throw new ApiException("forbidden", "عضو این پروژه نیستید.", 403);
        var members = await _db.ProjectMembers.Where(m => m.ProjectId == id)
            .Include(m => m.User).ToListAsync();
        return Ok(members.Select(m => new ProjectMemberDto(
            m.UserId, Mappers.ToUserBrief(m.User), m.RoleInProject, m.JoinedAt)).ToList());
    }

    [HttpPost("{id:guid}/members")]
    [RequirePermission(Perms.ProjectsManageMembers)]
    public async Task<ActionResult> AddMember(Guid id, [FromBody] AddMemberRequest req)
    {
        if (!await _db.Users.AnyAsync(u => u.Id == req.UserId && !u.IsDeleted))
            throw new ApiException("not_found", "کاربر یافت نشد.", 404);
        if (!await _db.ProjectMembers.AnyAsync(m => m.ProjectId == id && m.UserId == req.UserId))
            _db.ProjectMembers.Add(new ProjectMember
            { ProjectId = id, UserId = req.UserId, RoleInProject = req.RoleInProject });
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}/members/{userId:guid}")]
    [RequirePermission(Perms.ProjectsManageMembers)]
    public async Task<IActionResult> RemoveMember(Guid id, Guid userId)
    {
        var m = await _db.ProjectMembers.FirstOrDefaultAsync(x => x.ProjectId == id && x.UserId == userId);
        if (m is not null) _db.ProjectMembers.Remove(m);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:guid}/activity")]
    [RequirePermission(Perms.ProjectsView)]
    public async Task<ActionResult<List<ActivityDto>>> Activity(Guid id)
    {
        if (!await _perms.IsProjectMemberAsync(User.UserId(), id))
            throw new ApiException("forbidden", "عضو این پروژه نیستید.", 403);
        var logs = await _db.ActivityLogs.Where(a => a.ProjectId == id)
            .Include(a => a.Actor).OrderByDescending(a => a.CreatedAt).Take(200).ToListAsync();
        return Ok(logs.Select(a => new ActivityDto(a.Id, a.ProjectId, a.ActorId,
            Mappers.ToUserBrief(a.Actor), a.Action, a.ActionFa, a.EntityType,
            a.EntityId, a.EntityTitle, a.CreatedAt)).ToList());
    }

    [HttpGet("{id:guid}/milestones")]
    [RequirePermission(Perms.ProjectsView)]
    public async Task<ActionResult<List<MilestoneDto>>> Milestones(Guid id)
    {
        var ms = await _db.Milestones.Where(m => m.ProjectId == id).OrderBy(m => m.DueDate).ToListAsync();
        return Ok(ms.Select(m => new MilestoneDto(m.Id, m.ProjectId, m.Title, m.DueDate, m.IsDone, m.Progress)).ToList());
    }

    [HttpGet("{id:guid}/epics")]
    [RequirePermission(Perms.ProjectsView)]
    public async Task<ActionResult<List<EpicDto>>> Epics(Guid id)
    {
        var epics = await _db.Epics.Where(e => e.ProjectId == id).ToListAsync();
        var out_ = new List<EpicDto>();
        foreach (var e in epics)
        {
            var total = await _db.Tasks.CountAsync(t => t.EpicId == e.Id && !t.IsArchived);
            var done = await _db.Tasks.CountAsync(t => t.EpicId == e.Id && !t.IsArchived &&
                (t.Status == "done" || t.Status == "released"));
            out_.Add(new EpicDto(e.Id, e.ProjectId, e.BoardId, e.Title, e.Description, e.Color,
                total == 0 ? 0 : done * 100 / total));
        }
        return Ok(out_);
    }
}
