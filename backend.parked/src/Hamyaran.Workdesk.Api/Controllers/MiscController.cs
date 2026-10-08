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

/* ═══════════ Notifications ═══════════ */
[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;
    public NotificationsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<NotificationDto>>> List()
    {
        var uid = User.UserId();
        var ns = await _db.Notifications.Where(n => n.UserId == uid)
            .OrderByDescending(n => n.CreatedAt).Take(100).ToListAsync();
        return Ok(ns.Select(n => new NotificationDto(n.Id, n.Type, n.Title, n.Body, n.Link, n.IsRead, n.CreatedAt)).ToList());
    }

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var n = await _db.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == User.UserId());
        if (n is not null) n.IsRead = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var uid = User.UserId();
        await _db.Notifications.Where(n => n.UserId == uid && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        return NoContent();
    }
}

/* ═══════════ Calendar ═══════════ */
[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class CalendarController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly PermissionService _perms;
    public CalendarController(AppDbContext db, PermissionService perms) { _db = db; _perms = perms; }

    [HttpGet("events")]
    public async Task<ActionResult<List<CalendarEventDto>>> Events([FromQuery] Guid? projectId)
    {
        var uid = User.UserId();
        var pids = await _db.ProjectMembers.Where(m => m.UserId == uid).Select(m => m.ProjectId).ToListAsync();
        var q = _db.CalendarEvents.Where(e => !e.IsDeleted);
        q = projectId is not null
            ? q.Where(e => e.ProjectId == projectId || e.ProjectId == null)
            : q.Where(e => e.ProjectId == null || pids.Contains(e.ProjectId.Value));
        var evs = await q.OrderBy(e => e.StartsAt).ToListAsync();
        var out_ = evs.Select(e => new CalendarEventDto(e.Id, e.Title, e.Kind, e.ProjectId,
            e.TaskId, e.StartsAt, e.EndsAt, e.AllDay, e.Color, e.Description)).ToList();

        // Task deadlines as events
        var tq = _db.Tasks.Where(t => !t.IsArchived && t.DueDate != null);
        tq = projectId is not null ? tq.Where(t => t.ProjectId == projectId) : tq.Where(t => pids.Contains(t.ProjectId));
        var tasks = await tq.Select(t => new { t.Id, t.Title, t.ProjectId, t.DueDate, t.Priority }).ToListAsync();
        foreach (var t in tasks)
            out_.Add(new CalendarEventDto(Guid.Empty, t.Title, "task", t.ProjectId, t.Id,
                t.DueDate!.Value, t.DueDate!.Value, true,
                t.Priority == "critical" ? "#dc2626" : t.Priority == "high" ? "#f59e0b" : "#16a34a", null));
        return Ok(out_);
    }

    [HttpPost("events")]
    [RequirePermission(Perms.CalendarManage)]
    public async Task<ActionResult<CalendarEventDto>> Create([FromBody] CreateEventRequest req)
    {
        var e = new CalendarEvent
        {
            Title = req.Title, Kind = req.Kind, ProjectId = req.ProjectId,
            StartsAt = req.StartsAt, EndsAt = req.EndsAt, AllDay = req.AllDay,
            Color = req.Color, Description = req.Description, CreatedById = User.UserId(),
        };
        _db.CalendarEvents.Add(e);
        await _db.SaveChangesAsync();
        return Ok(new CalendarEventDto(e.Id, e.Title, e.Kind, e.ProjectId, null,
            e.StartsAt, e.EndsAt, e.AllDay, e.Color, e.Description));
    }

    [HttpPatch("events/{id:guid}")]
    [RequirePermission(Perms.CalendarManage)]
    public async Task<ActionResult<CalendarEventDto>> Update(Guid id, [FromBody] CreateEventRequest req)
    {
        var e = await _db.CalendarEvents.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (e is null) throw new ApiException("not_found", "رویداد یافت نشد.", 404);
        e.Title = req.Title; e.Kind = req.Kind; e.StartsAt = req.StartsAt;
        e.EndsAt = req.EndsAt; e.AllDay = req.AllDay; e.Color = req.Color; e.Description = req.Description;
        await _db.SaveChangesAsync();
        return Ok(new CalendarEventDto(e.Id, e.Title, e.Kind, e.ProjectId, null,
            e.StartsAt, e.EndsAt, e.AllDay, e.Color, e.Description));
    }

    [HttpDelete("events/{id:guid}")]
    [RequirePermission(Perms.CalendarManage)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var e = await _db.CalendarEvents.FirstOrDefaultAsync(x => x.Id == id);
        if (e is not null) e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

/* ═══════════ Reports ═══════════ */
[ApiController]
[Route("api/[controller]")]
[Authorize]
[RequirePermission(Perms.ReportsView)]
public sealed class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ReportsController(AppDbContext db) => _db = db;

    private IQueryable<TaskItem> Scoped(Guid? projectId, Guid uid)
    {
        var pids = _db.ProjectMembers.Where(m => m.UserId == uid).Select(m => m.ProjectId);
        var q = _db.Tasks.Where(t => !t.IsArchived && pids.Contains(t.ProjectId));
        if (projectId is not null) q = q.Where(t => t.ProjectId == projectId);
        return q;
    }

    [HttpGet("overview")]
    public async Task<ActionResult<OverviewDto>> Overview([FromQuery] Guid? projectId)
    {
        var tasks = await Scoped(projectId, User.UserId()).ToListAsync();
        var now = DateTime.UtcNow;
        static bool Done(TaskItem t) => t.Status is "done" or "released";
        var completed = tasks.Count(Done);
        return Ok(new OverviewDto(
            tasks.Count, completed,
            tasks.Count(t => t.Status is "in_progress" or "fixing" or "review" or "testing"),
            tasks.Count(t => t.IsBlocked),
            tasks.Count(t => t.DueDate < now && !Done(t)),
            tasks.Count(t => t.DueDate > now && t.DueDate < now.AddHours(48) && !Done(t)),
            tasks.Count == 0 ? 0 : completed * 100 / tasks.Count,
            tasks.Sum(t => t.EstimateMinutes ?? 0), tasks.Sum(t => t.SpentMinutes)));
    }

    [HttpGet("workload")]
    public async Task<ActionResult<List<WorkloadRowDto>>> Workload([FromQuery] Guid? projectId)
    {
        var tasks = await Scoped(projectId, User.UserId()).Include(t => t.Assignees).ToListAsync();
        var groups = tasks.SelectMany(t => t.Assignees.Select(a => (a.UserId, t))).GroupBy(x => x.UserId);
        var users = await _db.Users.Where(u => groups.Select(g => g.Key).Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);
        var now = DateTime.UtcNow;
        return Ok(groups.Select(g =>
        {
            var ts = g.Select(x => x.t).ToList();
            return new WorkloadRowDto(g.Key, Mappers.ToUserBrief(users[g.Key]), ts.Count,
                ts.Count(t => t.Status is "done" or "released"),
                ts.Count(t => t.DueDate < now && t.Status is not ("done" or "released")),
                ts.Sum(t => t.EstimateMinutes ?? 0), ts.Sum(t => t.SpentMinutes), 40 * 60 * 2);
        }).OrderByDescending(r => r.Assigned).ToList());
    }

    [HttpGet("streams")]
    public async Task<ActionResult<List<StreamProgressDto>>> Streams([FromQuery] Guid projectId)
    {
        var tasks = await Scoped(projectId, User.UserId())
            .Where(t => t.Stream != null).Select(t => new { t.Stream, t.Status }).ToListAsync();
        return Ok(tasks.GroupBy(t => t.Stream!).Select(g => new StreamProgressDto(
            g.Key, g.Count(),
            g.Count(t => t.Status is "done" or "released"),
            g.Count() == 0 ? 0 : g.Count(t => t.Status is "done" or "released") * 100 / g.Count())).ToList());
    }
}

/* ═══════════ Global search ═══════════ */
[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class SearchController : ControllerBase
{
    private readonly AppDbContext _db;
    public SearchController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<SearchResultsDto>> Global([FromQuery] string q)
    {
        var uid = User.UserId();
        var pids = await _db.ProjectMembers.Where(m => m.UserId == uid).Select(m => m.ProjectId).ToListAsync();
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return Ok(new SearchResultsDto([], [], [], [], []));
        var projects = await _db.Projects.Where(p => !p.IsDeleted && pids.Contains(p.Id) &&
            (p.Name.Contains(q) || p.Key.Contains(q))).Take(5).ToListAsync();
        var tasks = await _db.Tasks.Where(t => !t.IsArchived && pids.Contains(t.ProjectId) &&
            t.Title.Contains(q)).Take(8).ToListAsync();
        var users = await _db.Users.Where(u => !u.IsDeleted &&
            (u.Name.Contains(q) || u.Username.Contains(q))).Take(5).ToListAsync();
        var files = await _db.ProjectFiles.Where(f => !f.IsDeleted && pids.Contains(f.ProjectId) &&
            f.FileName.Contains(q)).Take(5).ToListAsync();
        var myConvos = _db.ConversationMembers.Where(m => m.UserId == uid).Select(m => m.ConversationId);
        var messages = await _db.Messages.Where(m => !m.IsDeleted &&
            myConvos.Contains(m.ConversationId) && m.Body.Contains(q)).Take(5).ToListAsync();
        return Ok(new SearchResultsDto(
            projects.Select(p => Mappers.ToProjectDto(p, 0, 0, 0, 0, 0, false)).ToList(),
            tasks.Select(t => new TaskDto(t.Id, t.ProjectId, t.BoardId, t.ColumnId, t.EpicId, t.ParentId,
                t.Title, t.Description, t.Status, t.Priority, [], [], t.ReviewerId, null, [],
                t.CreatorId, t.StartDate, t.DueDate, t.EstimateMinutes, t.SpentMinutes, [], t.Stream,
                [], [], [], [], [], [], [], [], t.Progress, t.Order, t.IsBlocked, t.CreatedAt, t.UpdatedAt)).ToList(),
            users.Select(Mappers.ToUserBrief).ToList(),
            files.Select(f => new ProjectFileDto(f.Id, f.ProjectId, f.Folder, f.FileName, f.MimeType,
                f.SizeBytes, f.Version, f.UploadedById, null, f.CreatedAt, f.UpdatedAt)).ToList(),
            messages.Select(m => new MessageDto(m.Id, m.ConversationId, m.SenderId, null, m.Body,
                m.ReplyToId, null, [], m.IsEdited, m.IsPinned, [], m.CreatedAt, m.UpdatedAt)).ToList()));
    }
}

/* ═══════════ Admin / audit ═══════════ */
[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminController(AppDbContext db) => _db = db;

    [HttpGet("audit")]
    [RequirePermission(Perms.AuditView)]
    public async Task<ActionResult<List<ActivityDto>>> Audit(
        [FromQuery] Guid? projectId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var q = _db.ActivityLogs.AsQueryable();
        if (projectId is not null) q = q.Where(a => a.ProjectId == projectId);
        var logs = await q.Include(a => a.Actor).OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(logs.Select(a => new ActivityDto(a.Id, a.ProjectId, a.ActorId,
            Mappers.ToUserBrief(a.Actor), a.Action, a.ActionFa, a.EntityType,
            a.EntityId, a.EntityTitle, a.CreatedAt)).ToList());
    }
}
