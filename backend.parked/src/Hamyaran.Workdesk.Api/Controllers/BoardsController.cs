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
[Route("api/projects/{projectId:guid}/[controller]")]
[Authorize]
public sealed class BoardsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly PermissionService _perms;
    private readonly AuditService _audit;

    public BoardsController(AppDbContext db, PermissionService perms, AuditService audit)
    {
        _db = db; _perms = perms; _audit = audit;
    }

    private async Task EnsureMemberAsync(Guid projectId)
    {
        if (!await _perms.IsProjectMemberAsync(User.UserId(), projectId))
            throw new ApiException("forbidden", "عضو این پروژه نیستید.", 403);
    }

    [HttpGet]
    [RequirePermission(Perms.BoardsView)]
    public async Task<ActionResult<List<BoardDto>>> List(Guid projectId)
    {
        await EnsureMemberAsync(projectId);
        var boards = await _db.Boards.Where(b => b.ProjectId == projectId)
            .Include(b => b.Columns).OrderBy(b => b.CreatedAt).ToListAsync();
        return Ok(boards.Select(Mappers.ToBoardDto).ToList());
    }

    [HttpGet("/api/boards/{id:guid}")]
    [RequirePermission(Perms.BoardsView)]
    public async Task<ActionResult<BoardDto>> Get(Guid id)
    {
        var b = await _db.Boards.Include(x => x.Columns).FirstOrDefaultAsync(x => x.Id == id);
        if (b is null) throw new ApiException("not_found", "بورد یافت نشد.", 404);
        await EnsureMemberAsync(b.ProjectId);
        return Ok(Mappers.ToBoardDto(b));
    }

    [HttpPost]
    [RequirePermission(Perms.BoardsCreate)]
    public async Task<ActionResult<BoardDto>> Create(Guid projectId, [FromBody] CreateBoardRequest req)
    {
        await EnsureMemberAsync(projectId);
        var b = new Board { ProjectId = projectId, Name = req.Name, Kind = req.Kind };
        var i = 0;
        foreach (var (title, key, color) in new[]
                 { ("بک‌لاگ", "backlog", "#64748b"), ("در حال انجام", "in_progress", "#8b5cf6"),
                   ("بازبینی", "review", "#f59e0b"), ("انجام‌شده", "done", "#16a34a") })
            b.Columns.Add(new BoardColumn
            { Title = title, Key = key, Color = color, Order = i++, IsDoneColumn = key == "done" });
        _db.Boards.Add(b);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User.UserId(), "board.create", "بورد جدید ساخت", "board",
            projectId, b.Id, b.Name);
        return CreatedAtAction(nameof(Get), new { id = b.Id }, Mappers.ToBoardDto(b));
    }

    [HttpPost("/api/boards/{id:guid}/columns")]
    [RequirePermission(Perms.BoardsManageColumns)]
    public async Task<ActionResult<BoardDto>> AddColumn(Guid id, [FromBody] CreateColumnRequest req)
    {
        var b = await _db.Boards.Include(x => x.Columns).FirstOrDefaultAsync(x => x.Id == id);
        if (b is null) throw new ApiException("not_found", "بورد یافت نشد.", 404);
        await EnsureMemberAsync(b.ProjectId);
        var order = b.Columns.Count == 0 ? 0 : b.Columns.Max(c => c.Order) + 1;
        b.Columns.Add(new BoardColumn
        {
            Title = req.Title, Key = $"col_{Guid.NewGuid():N}"[..12],
            Color = req.Color, Order = order,
        });
        await _db.SaveChangesAsync();
        return Ok(Mappers.ToBoardDto(b));
    }

    [HttpPatch("/api/boards/{id:guid}/columns/{columnId:guid}")]
    [RequirePermission(Perms.BoardsManageColumns)]
    public async Task<ActionResult<BoardDto>> UpdateColumn(Guid id, Guid columnId, [FromBody] UpdateColumnRequest req)
    {
        var b = await _db.Boards.Include(x => x.Columns).FirstOrDefaultAsync(x => x.Id == id);
        var c = b?.Columns.FirstOrDefault(x => x.Id == columnId);
        if (b is null || c is null) throw new ApiException("not_found", "ستون یافت نشد.", 404);
        await EnsureMemberAsync(b.ProjectId);
        if (req.Title is not null) c.Title = req.Title;
        if (req.Color is not null) c.Color = req.Color;
        c.WipLimit = req.WipLimit;
        await _db.SaveChangesAsync();
        return Ok(Mappers.ToBoardDto(b));
    }

    [HttpDelete("/api/boards/{id:guid}/columns/{columnId:guid}")]
    [RequirePermission(Perms.BoardsManageColumns)]
    public async Task<ActionResult<BoardDto>> DeleteColumn(Guid id, Guid columnId)
    {
        var b = await _db.Boards.Include(x => x.Columns).FirstOrDefaultAsync(x => x.Id == id);
        if (b is null) throw new ApiException("not_found", "بورد یافت نشد.", 404);
        await EnsureMemberAsync(b.ProjectId);
        if (b.Columns.Count <= 1)
            throw new ApiException("invalid", "بورد باید حداقل یک ستون داشته باشد.", 400);
        var first = b.Columns.OrderBy(c => c.Order).First(c => c.Id != columnId);
        foreach (var t in _db.Tasks.Where(t => t.BoardId == id && t.ColumnId == columnId))
        {
            t.ColumnId = first.Id;
            t.Status = first.Key;
        }
        b.Columns.Remove(b.Columns.First(c => c.Id == columnId));
        await _db.SaveChangesAsync();
        return Ok(Mappers.ToBoardDto(b));
    }

    [HttpPost("/api/boards/{id:guid}/columns/reorder")]
    [RequirePermission(Perms.BoardsEdit)]
    public async Task<ActionResult<BoardDto>> Reorder(Guid id, [FromBody] ReorderColumnsRequest req)
    {
        var b = await _db.Boards.Include(x => x.Columns).FirstOrDefaultAsync(x => x.Id == id);
        if (b is null) throw new ApiException("not_found", "بورد یافت نشد.", 404);
        await EnsureMemberAsync(b.ProjectId);
        var order = req.ColumnIds.Select((cid, i) => (cid, i)).ToDictionary(x => x.cid, x => x.i);
        foreach (var c in b.Columns)
            if (order.TryGetValue(c.Id, out var i)) c.Order = i;
        await _db.SaveChangesAsync();
        return Ok(Mappers.ToBoardDto(b));
    }
}
