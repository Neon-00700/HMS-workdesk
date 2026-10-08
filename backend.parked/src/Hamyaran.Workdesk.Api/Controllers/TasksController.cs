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
public sealed class TasksController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly PermissionService _perms;
    private readonly AuditService _audit;

    public TasksController(AppDbContext db, PermissionService perms, AuditService audit)
    {
        _db = db; _perms = perms; _audit = audit;
    }

    private async Task EnsureMemberAsync(Guid projectId)
    {
        if (!await _perms.IsProjectMemberAsync(User.UserId(), projectId))
            throw new ApiException("forbidden", "عضو این پروژه نیستید.", 403);
    }

    private static TaskDto ToDto(TaskItem t, Dictionary<Guid, User> users)
    {
        UserDto? Brief(Guid? id) => id is null || !users.TryGetValue(id.Value, out var u) ? null : Mappers.ToUserBrief(u);
        var assignees = t.Assignees.Select(a => users.TryGetValue(a.UserId, out var u) ? u : null)
            .Where(u => u is not null).Select(Mappers.ToUserBrief!).ToList();
        return new TaskDto(
            t.Id, t.ProjectId, t.BoardId, t.ColumnId, t.EpicId, t.ParentId, t.Title, t.Description,
            t.Status, t.Priority, t.Assignees.Select(a => a.UserId).ToList(), assignees,
            t.ReviewerId, Brief(t.ReviewerId), t.Watchers.Select(w => w.UserId).ToList(), t.CreatorId,
            t.StartDate, t.DueDate, t.EstimateMinutes, t.SpentMinutes,
            t.Labels.Select(l => new LabelDto(l.LabelId, l.Label.Name, l.Label.Color)).ToList(), t.Stream,
            t.Subtasks.Select(s => new SubtaskDto(s.Id, s.Title, s.IsDone, s.AssigneeId, s.DueDate)).ToList(),
            t.Checklist.Select(c => new ChecklistDto(c.Id, c.Text, c.IsDone)).ToList(),
            t.Dependencies.Select(d => new DependencyDto(d.Id, d.TaskId, d.DependsOnTaskId, d.Kind)).ToList(),
            t.Dependencies.Select(d => d.DependsOnTaskId).ToList(), new(),
            t.Comments.Where(c => !c.IsDeleted).Select(c =>
                new CommentDto(c.Id, c.TaskId, c.AuthorId, Brief(c.AuthorId), c.Body, c.CreatedAt, c.UpdatedAt, c.UpdatedAt > c.CreatedAt)).ToList(),
            t.Attachments.Select(a =>
                new AttachmentDto(a.Id, a.TaskId, a.FileName, a.MimeType, a.SizeBytes, a.UploadedById, Brief(a.UploadedById), a.Version, a.CreatedAt)).ToList(),
            t.TimeEntries.Select(e =>
                new TimeEntryDto(e.Id, e.TaskId, e.UserId, Brief(e.UserId), e.Minutes, e.Note, e.StartedAt, e.EndedAt, e.EndedAt == null)).ToList(),
            t.Progress, t.Order, t.IsBlocked, t.CreatedAt, t.UpdatedAt);
    }

    private async Task<Dictionary<Guid, User>> UsersForAsync(IEnumerable<TaskItem> tasks)
    {
        var ids = tasks.SelectMany(t => t.Assignees.Select(a => a.UserId)
                .Concat(t.Watchers.Select(w => w.UserId))
                .Concat(t.Comments.Select(c => c.AuthorId))
                .Concat(t.TimeEntries.Select(e => e.UserId))
                .Concat(t.ReviewerId is null ? [] : [t.ReviewerId.Value])
                .Concat([t.CreatorId]))
            .Distinct().ToList();
        return await _db.Users.Where(u => ids.Contains(u.Id)).ToDictionaryAsync(u => u.Id);
    }

    private IQueryable<TaskItem> Full() => _db.Tasks
        .Include(t => t.Assignees).Include(t => t.Watchers)
        .Include(t => t.Labels).ThenInclude(l => l.Label)
        .Include(t => t.Subtasks).Include(t => t.Checklist)
        .Include(t => t.Dependencies)
        .Include(t => t.Comments).Include(t => t.Attachments).Include(t => t.TimeEntries);

    [HttpGet]
    [RequirePermission(Perms.TasksView)]
    public async Task<ActionResult<Paged<TaskDto>>> List(
        [FromQuery] Guid? projectId, [FromQuery] Guid? boardId, [FromQuery] Guid? assigneeId,
        [FromQuery] string? search, [FromQuery] string? priorities, [FromQuery] string? streams,
        [FromQuery] bool overdueOnly = false, [FromQuery] bool blockedOnly = false,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var q = Full().Where(t => !t.IsArchived);
        if (projectId is not null)
        {
            await EnsureMemberAsync(projectId.Value);
            q = q.Where(t => t.ProjectId == projectId);
        }
        else
        {
            // Global views: restrict to member projects
            var uid = User.UserId();
            var pids = _db.ProjectMembers.Where(m => m.UserId == uid).Select(m => m.ProjectId);
            q = q.Where(t => pids.Contains(t.ProjectId));
        }
        if (boardId is not null) q = q.Where(t => t.BoardId == boardId);
        if (assigneeId is not null) q = q.Where(t => t.Assignees.Any(a => a.UserId == assigneeId));
        if (!string.IsNullOrWhiteSpace(search)) q = q.Where(t => t.Title.Contains(search));
        if (!string.IsNullOrWhiteSpace(priorities))
        {
            var ps = priorities.Split(',');
            q = q.Where(t => ps.Contains(t.Priority));
        }
        if (!string.IsNullOrWhiteSpace(streams))
        {
            var ss = streams.Split(',');
            q = q.Where(t => t.Stream != null && ss.Contains(t.Stream));
        }
        if (overdueOnly)
        {
            var now = DateTime.UtcNow;
            q = q.Where(t => t.DueDate < now && t.Status != "done" && t.Status != "released");
        }
        if (blockedOnly) q = q.Where(t => t.IsBlocked);

        pageSize = Math.Clamp(pageSize, 1, 500);
        var total = await q.CountAsync();
        var items = await q.OrderBy(t => t.Order).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var users = await UsersForAsync(items);
        return Ok(new Paged<TaskDto>(items.Select(t => ToDto(t, users)).ToList(), total, page, pageSize));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Perms.TasksView)]
    public async Task<ActionResult<TaskDto>> Get(Guid id)
    {
        var t = await Full().FirstOrDefaultAsync(x => x.Id == id && !x.IsArchived);
        if (t is null) throw new ApiException("not_found", "تسک یافت نشد.", 404);
        await EnsureMemberAsync(t.ProjectId);
        return Ok(ToDto(t, await UsersForAsync([t])));
    }

    [HttpPost]
    [RequirePermission(Perms.TasksCreate)]
    public async Task<ActionResult<TaskDto>> Create([FromBody] CreateTaskRequest req)
    {
        await EnsureMemberAsync(req.ProjectId);
        var col = await _db.BoardColumns.FirstOrDefaultAsync(c => c.Id == req.ColumnId && c.BoardId == req.BoardId);
        if (col is null) throw new ApiException("invalid", "ستون نامعتبر است.", 400);
        var uid = User.UserId();
        var t = new TaskItem
        {
            Title = req.Title, Description = req.Description ?? "",
            ProjectId = req.ProjectId, BoardId = req.BoardId, ColumnId = req.ColumnId,
            Status = col.Key, Priority = req.Priority, Stream = req.Stream,
            ReviewerId = req.ReviewerId, CreatorId = uid, DueDate = req.DueDate,
            EstimateMinutes = req.EstimateMinutes, EpicId = req.EpicId,
            Order = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        };
        foreach (var aid in req.AssigneeIds ?? []) t.Assignees.Add(new TaskAssignee { UserId = aid });
        if (req.LabelIds is not null)
            foreach (var lid in req.LabelIds) t.Labels.Add(new TaskLabel { LabelId = lid });
        _db.Tasks.Add(t);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(uid, "task.create", "تسک جدید ساخت", "task", t.ProjectId, t.Id, t.Title);
        // Notify assignees
        foreach (var aid in req.AssigneeIds ?? [])
            if (aid != uid)
                _db.Notifications.Add(new Notification
                {
                    UserId = aid, Type = "task_assigned",
                    Title = "تسک جدید به شما تخصیص یافت", Body = t.Title, Link = $"/tasks/{t.Id}",
                });
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = t.Id }, await GetDtoAsync(t.Id));
    }

    private async Task<TaskDto> GetDtoAsync(Guid id)
    {
        var t = await Full().FirstAsync(x => x.Id == id);
        return ToDto(t, await UsersForAsync([t]));
    }

    [HttpPatch("{id:guid}")]
    [RequirePermission(Perms.TasksEdit)]
    public async Task<ActionResult<TaskDto>> Update(Guid id, [FromBody] UpdateTaskRequest req)
    {
        var t = await Full().FirstOrDefaultAsync(x => x.Id == id);
        if (t is null) throw new ApiException("not_found", "تسک یافت نشد.", 404);
        await EnsureMemberAsync(t.ProjectId);
        if (req.Title is not null) t.Title = req.Title;
        if (req.Description is not null) t.Description = req.Description;
        if (req.Priority is not null) t.Priority = req.Priority;
        if (req.Stream is not null) t.Stream = req.Stream;
        if (req.ReviewerId is not null) t.ReviewerId = req.ReviewerId;
        if (req.DueDate is not null) t.DueDate = req.DueDate;
        if (req.StartDate is not null) t.StartDate = req.StartDate;
        if (req.EstimateMinutes is not null) t.EstimateMinutes = req.EstimateMinutes;
        if (req.Progress is not null) t.Progress = Math.Clamp(req.Progress.Value, 0, 100);
        if (req.AssigneeIds is not null)
        {
            if (!User.HasClaim("perm", Perms.TasksAssign))
                throw new ApiException("forbidden", "دسترسی تخصیص ندارید.", 403);
            _db.TaskAssignees.RemoveRange(t.Assignees);
            foreach (var aid in req.AssigneeIds) t.Assignees.Add(new TaskAssignee { UserId = aid });
        }
        if (req.LabelIds is not null)
        {
            _db.TaskLabels.RemoveRange(t.Labels);
            foreach (var lid in req.LabelIds) t.Labels.Add(new TaskLabel { LabelId = lid });
        }
        t.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(await GetDtoAsync(id));
    }

    [HttpPost("{id:guid}/move")]
    [RequirePermission(Perms.TasksMove)]
    public async Task<ActionResult<TaskDto>> Move(Guid id, [FromBody] MoveTaskRequest req)
    {
        var t = await _db.Tasks.FirstOrDefaultAsync(x => x.Id == id);
        if (t is null) throw new ApiException("not_found", "تسک یافت نشد.", 404);
        await EnsureMemberAsync(t.ProjectId);
        var col = await _db.BoardColumns.FirstOrDefaultAsync(c => c.Id == req.ColumnId && c.BoardId == t.BoardId);
        if (col is null) throw new ApiException("invalid", "ستون نامعتبر است.", 400);
        t.ColumnId = col.Id;
        t.Status = col.Key;
        t.Order = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        t.IsBlocked = col.Key == "blocked";
        if (col.IsDoneColumn) t.Progress = 100;
        t.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User.UserId(), "task.move", "تسک را جابه‌جا کرد", "task",
            t.ProjectId, t.Id, t.Title);
        return Ok(await GetDtoAsync(id));
    }

    [HttpPost("{id:guid}/move-board")]
    [RequirePermission(Perms.TasksMove)]
    public async Task<ActionResult<TaskDto>> MoveBoard(Guid id, [FromBody] MoveToBoardRequest req)
    {
        var t = await _db.Tasks.FirstOrDefaultAsync(x => x.Id == id);
        if (t is null) throw new ApiException("not_found", "تسک یافت نشد.", 404);
        var board = await _db.Boards.FirstOrDefaultAsync(b => b.Id == req.BoardId && b.ProjectId == t.ProjectId);
        var col = board is null ? null
            : await _db.BoardColumns.FirstOrDefaultAsync(c => c.Id == req.ColumnId && c.BoardId == board.Id);
        if (board is null || col is null) throw new ApiException("invalid", "مقصد نامعتبر است.", 400);
        await EnsureMemberAsync(t.ProjectId);
        t.BoardId = board.Id;
        t.ColumnId = col.Id;
        t.Status = col.Key;
        t.IsBlocked = col.Key == "blocked";
        t.Order = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        t.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(await GetDtoAsync(id));
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(Perms.TasksDelete)]
    public async Task<IActionResult> Archive(Guid id)
    {
        var t = await _db.Tasks.FirstOrDefaultAsync(x => x.Id == id);
        if (t is null) throw new ApiException("not_found", "تسک یافت نشد.", 404);
        await EnsureMemberAsync(t.ProjectId);
        t.IsArchived = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /* ── Comments ── */
    [HttpPost("{id:guid}/comments")]
    [RequirePermission(Perms.TasksEdit)]
    public async Task<ActionResult<CommentDto>> AddComment(Guid id, [FromBody] AddCommentRequest req)
    {
        var t = await _db.Tasks.FindAsync(id);
        if (t is null) throw new ApiException("not_found", "تسک یافت نشد.", 404);
        await EnsureMemberAsync(t.ProjectId);
        var c = new Comment { TaskId = id, AuthorId = User.UserId(), Body = req.Body };
        _db.Comments.Add(c);
        t.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User.UserId(), "task.comment", "نظر گذاشت", "task", t.ProjectId, t.Id, t.Title);
        var author = await _db.Users.FindAsync(c.AuthorId);
        return Ok(new CommentDto(c.Id, c.TaskId, c.AuthorId,
            author is null ? null : Mappers.ToUserBrief(author), c.Body, c.CreatedAt, c.UpdatedAt, false));
    }

    [HttpDelete("{id:guid}/comments/{commentId:guid}")]
    [RequirePermission(Perms.TasksEdit)]
    public async Task<IActionResult> DeleteComment(Guid id, Guid commentId)
    {
        var c = await _db.Comments.FirstOrDefaultAsync(x => x.Id == commentId && x.TaskId == id);
        if (c is null) throw new ApiException("not_found", "نظر یافت نشد.", 404);
        if (c.AuthorId != User.UserId() && !User.HasClaim("perm", Perms.ChatManage))
            throw new ApiException("forbidden", "فقط نویسنده می‌تواند حذف کند.", 403);
        c.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /* ── Checklist / subtasks ── */
    [HttpPost("{id:guid}/checklist")]
    [RequirePermission(Perms.TasksEdit)]
    public async Task<ActionResult<TaskDto>> AddChecklist(Guid id, [FromBody] AddChecklistRequest req)
    {
        var t = await _db.Tasks.FindAsync(id);
        if (t is null) throw new ApiException("not_found", "تسک یافت نشد.", 404);
        await EnsureMemberAsync(t.ProjectId);
        _db.ChecklistItems.Add(new ChecklistItem { TaskId = id, Text = req.Text });
        await _db.SaveChangesAsync();
        return Ok(await GetDtoAsync(id));
    }

    [HttpPost("{id:guid}/checklist/{itemId:guid}/toggle")]
    [RequirePermission(Perms.TasksEdit)]
    public async Task<ActionResult<TaskDto>> ToggleChecklist(Guid id, Guid itemId)
    {
        var item = await _db.ChecklistItems.FirstOrDefaultAsync(x => x.Id == itemId && x.TaskId == id);
        if (item is null) throw new ApiException("not_found", "مورد یافت نشد.", 404);
        item.IsDone = !item.IsDone;
        await _db.SaveChangesAsync();
        return Ok(await GetDtoAsync(id));
    }

    [HttpPost("{id:guid}/subtasks")]
    [RequirePermission(Perms.TasksEdit)]
    public async Task<ActionResult<TaskDto>> AddSubtask(Guid id, [FromBody] AddSubtaskRequest req)
    {
        var t = await _db.Tasks.FindAsync(id);
        if (t is null) throw new ApiException("not_found", "تسک یافت نشد.", 404);
        await EnsureMemberAsync(t.ProjectId);
        _db.Subtasks.Add(new Subtask { TaskId = id, Title = req.Title });
        await _db.SaveChangesAsync();
        return Ok(await GetDtoAsync(id));
    }

    [HttpPost("{id:guid}/subtasks/{subId:guid}/toggle")]
    [RequirePermission(Perms.TasksEdit)]
    public async Task<ActionResult<TaskDto>> ToggleSubtask(Guid id, Guid subId)
    {
        var t = await _db.Tasks.Include(x => x.Subtasks).FirstOrDefaultAsync(x => x.Id == id);
        var st = t?.Subtasks.FirstOrDefault(x => x.Id == subId);
        if (t is null || st is null) throw new ApiException("not_found", "ساب‌تسک یافت نشد.", 404);
        st.IsDone = !st.IsDone;
        if (t.Subtasks.Count > 0)
            t.Progress = t.Subtasks.Count(s => s.IsDone) * 100 / t.Subtasks.Count;
        await _db.SaveChangesAsync();
        return Ok(await GetDtoAsync(id));
    }

    /* ── Dependencies ── */
    [HttpPost("{id:guid}/dependencies")]
    [RequirePermission(Perms.TasksManageDependencies)]
    public async Task<ActionResult<TaskDto>> AddDependency(Guid id, [FromBody] AddDependencyRequest req)
    {
        if (id == req.DependsOnTaskId)
            throw new ApiException("invalid", "تسک نمی‌تواند به خودش وابسته باشد.", 400);
        var t = await _db.Tasks.FindAsync(id);
        var other = await _db.Tasks.FindAsync(req.DependsOnTaskId);
        if (t is null || other is null) throw new ApiException("not_found", "تسک یافت نشد.", 404);
        await EnsureMemberAsync(t.ProjectId);
        if (await _db.TaskDependencies.AnyAsync(d => d.TaskId == id && d.DependsOnTaskId == req.DependsOnTaskId))
            throw new ApiException("duplicate", "این وابستگی قبلاً ثبت شده است.", 409);
        _db.TaskDependencies.Add(new TaskDependency
        { TaskId = id, DependsOnTaskId = req.DependsOnTaskId, Kind = req.Kind });
        await _db.SaveChangesAsync();
        return Ok(await GetDtoAsync(id));
    }

    [HttpDelete("{id:guid}/dependencies/{depId:guid}")]
    [RequirePermission(Perms.TasksManageDependencies)]
    public async Task<ActionResult<TaskDto>> RemoveDependency(Guid id, Guid depId)
    {
        var d = await _db.TaskDependencies.FirstOrDefaultAsync(x => x.Id == depId && x.TaskId == id);
        if (d is not null) _db.TaskDependencies.Remove(d);
        await _db.SaveChangesAsync();
        return Ok(await GetDtoAsync(id));
    }

    /* ── Watchers ── */
    [HttpPost("{id:guid}/watch")]
    [RequirePermission(Perms.TasksView)]
    public async Task<ActionResult<TaskDto>> ToggleWatch(Guid id)
    {
        var uid = User.UserId();
        var t = await _db.Tasks.FindAsync(id);
        if (t is null) throw new ApiException("not_found", "تسک یافت نشد.", 404);
        await EnsureMemberAsync(t.ProjectId);
        var w = await _db.TaskWatchers.FirstOrDefaultAsync(x => x.TaskId == id && x.UserId == uid);
        if (w is null) _db.TaskWatchers.Add(new TaskWatcher { TaskId = id, UserId = uid });
        else _db.TaskWatchers.Remove(w);
        await _db.SaveChangesAsync();
        return Ok(await GetDtoAsync(id));
    }

    /* ── Time tracking ── */
    [HttpPost("{id:guid}/timer/start")]
    [RequirePermission(Perms.TasksEdit)]
    public async Task<ActionResult<TimeEntryDto>> StartTimer(Guid id)
    {
        var t = await _db.Tasks.Include(x => x.TimeEntries).FirstOrDefaultAsync(x => x.Id == id);
        if (t is null) throw new ApiException("not_found", "تسک یافت نشد.", 404);
        await EnsureMemberAsync(t.ProjectId);
        foreach (var e in t.TimeEntries.Where(e => e.EndedAt == null))
        {
            e.EndedAt = DateTime.UtcNow;
            e.Minutes += Math.Max(1, (int)(DateTime.UtcNow - e.StartedAt).TotalMinutes);
        }
        var entry = new TimeEntry { TaskId = id, UserId = User.UserId(), StartedAt = DateTime.UtcNow };
        _db.TimeEntries.Add(entry);
        await _db.SaveChangesAsync();
        return Ok(new TimeEntryDto(entry.Id, id, entry.UserId, null, 0, null, entry.StartedAt, null, true));
    }

    [HttpPost("{id:guid}/timer/{entryId:guid}/stop")]
    [RequirePermission(Perms.TasksEdit)]
    public async Task<ActionResult<TimeEntryDto>> StopTimer(Guid id, Guid entryId)
    {
        var t = await _db.Tasks.Include(x => x.TimeEntries).FirstOrDefaultAsync(x => x.Id == id);
        var e = t?.TimeEntries.FirstOrDefault(x => x.Id == entryId && x.EndedAt == null);
        if (t is null || e is null) throw new ApiException("not_found", "رکورد زمانی یافت نشد.", 404);
        await EnsureMemberAsync(t.ProjectId);
        e.EndedAt = DateTime.UtcNow;
        var mins = Math.Max(1, (int)(DateTime.UtcNow - e.StartedAt).TotalMinutes);
        e.Minutes += mins;
        t.SpentMinutes += mins;
        await _db.SaveChangesAsync();
        return Ok(new TimeEntryDto(e.Id, id, e.UserId, null, e.Minutes, e.Note, e.StartedAt, e.EndedAt, false));
    }

    [HttpPost("{id:guid}/time")]
    [RequirePermission(Perms.TasksEdit)]
    public async Task<ActionResult<TimeEntryDto>> LogTime(Guid id, [FromBody] LogTimeRequest req)
    {
        var t = await _db.Tasks.FindAsync(id);
        if (t is null) throw new ApiException("not_found", "تسک یافت نشد.", 404);
        await EnsureMemberAsync(t.ProjectId);
        var e = new TimeEntry
        {
            TaskId = id, UserId = User.UserId(), Minutes = req.Minutes,
            Note = req.Note, StartedAt = DateTime.UtcNow, EndedAt = DateTime.UtcNow,
        };
        _db.TimeEntries.Add(e);
        t.SpentMinutes += req.Minutes;
        await _db.SaveChangesAsync();
        return Ok(new TimeEntryDto(e.Id, id, e.UserId, null, e.Minutes, e.Note, e.StartedAt, e.EndedAt, false));
    }
}
