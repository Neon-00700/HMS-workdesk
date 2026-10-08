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
[RequestSizeLimit(110_000_000)]
public sealed class FilesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly PermissionService _perms;
    private readonly FileStorageService _storage;
    private readonly AuditService _audit;

    public FilesController(AppDbContext db, PermissionService perms,
        FileStorageService storage, AuditService audit)
    {
        _db = db; _perms = perms; _storage = storage; _audit = audit;
    }

    [HttpGet]
    [RequirePermission(Perms.FilesView)]
    public async Task<ActionResult<List<ProjectFileDto>>> List([FromQuery] Guid? projectId)
    {
        var uid = User.UserId();
        var q = _db.ProjectFiles.Where(f => !f.IsDeleted);
        if (projectId is not null)
        {
            if (!await _perms.IsProjectMemberAsync(uid, projectId.Value))
                throw new ApiException("forbidden", "عضو این پروژه نیستید.", 403);
            q = q.Where(f => f.ProjectId == projectId);
        }
        else
        {
            var pids = _db.ProjectMembers.Where(m => m.UserId == uid).Select(m => m.ProjectId);
            q = q.Where(f => pids.Contains(f.ProjectId));
        }
        var files = await q.Include(f => f.UploadedBy).OrderByDescending(f => f.UpdatedAt).ToListAsync();
        return Ok(files.Select(f => new ProjectFileDto(f.Id, f.ProjectId, f.Folder, f.FileName,
            f.MimeType, f.SizeBytes, f.Version, f.UploadedById, Mappers.ToUserBrief(f.UploadedBy),
            f.CreatedAt, f.UpdatedAt)).ToList());
    }

    [HttpPost("upload")]
    [RequirePermission(Perms.FilesUpload)]
    public async Task<ActionResult<ProjectFileDto>> Upload(
        [FromForm] Guid projectId, [FromForm] string folder,
        [FromForm] string policyKey, [FromForm] IFormFile file,
        CancellationToken ct)
    {
        var uid = User.UserId();
        if (!await _perms.IsProjectMemberAsync(uid, projectId))
            throw new ApiException("forbidden", "عضو این پروژه نیستید.", 403);

        await using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        var bytes = ms.ToArray();
        var policy = new FilePolicyService();
        var (ok, error, safe) = policy.Validate(policyKey, file.FileName, bytes.Length, bytes.AsSpan(0, Math.Min(12, bytes.Length)));
        if (!ok) throw new ApiException("invalid_file", error ?? "فایل نامعتبر است.", 422);

        var stored = _storage.StoredName(safe);
        ms.Position = 0;
        var relative = await _storage.SaveAsync(ms, stored, ct);

        var f = new ProjectFile
        {
            ProjectId = projectId, Folder = folder, FileName = safe, StoredName = relative,
            MimeType = file.ContentType, SizeBytes = bytes.Length, UploadedById = uid,
        };
        _db.ProjectFiles.Add(f);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(uid, "file.upload", "فایل بارگذاری کرد", "file", projectId, f.Id, f.FileName);
        var uploader = await _db.Users.FindAsync(uid);
        return Ok(new ProjectFileDto(f.Id, f.ProjectId, f.Folder, f.FileName, f.MimeType,
            f.SizeBytes, f.Version, f.UploadedById,
            uploader is null ? null : Mappers.ToUserBrief(uploader), f.CreatedAt, f.UpdatedAt));
    }

    [HttpGet("{id:guid}/download")]
    [RequirePermission(Perms.FilesDownload)]
    public async Task<IActionResult> Download(Guid id)
    {
        var f = await _db.ProjectFiles.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (f is null) throw new ApiException("not_found", "فایل یافت نشد.", 404);
        if (!await _perms.IsProjectMemberAsync(User.UserId(), f.ProjectId))
            throw new ApiException("forbidden", "عضو این پروژه نیستید.", 403);
        var (stream, mime) = _storage.Open(f.StoredName, f.MimeType);
        // Force download (attachment) — never execute uploaded content.
        return File(stream, "application/octet-stream", f.FileName);
    }

    [HttpPatch("{id:guid}")]
    [RequirePermission(Perms.FilesUpload)]
    public async Task<ActionResult<ProjectFileDto>> Rename(Guid id, [FromBody] RenameFileRequest req)
    {
        var f = await _db.ProjectFiles.Include(x => x.UploadedBy)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (f is null) throw new ApiException("not_found", "فایل یافت نشد.", 404);
        f.FileName = FilePolicyService.Sanitize(req.FileName);
        f.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new ProjectFileDto(f.Id, f.ProjectId, f.Folder, f.FileName, f.MimeType,
            f.SizeBytes, f.Version, f.UploadedById, Mappers.ToUserBrief(f.UploadedBy),
            f.CreatedAt, f.UpdatedAt));
    }

    [HttpPost("{id:guid}/move")]
    [RequirePermission(Perms.FilesUpload)]
    public async Task<IActionResult> Move(Guid id, [FromBody] MoveFileRequest req)
    {
        var f = await _db.ProjectFiles.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (f is null) throw new ApiException("not_found", "فایل یافت نشد.", 404);
        f.Folder = req.Folder;
        f.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(Perms.FilesDelete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var f = await _db.ProjectFiles.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (f is null) throw new ApiException("not_found", "فایل یافت نشد.", 404);
        f.IsDeleted = true;
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User.UserId(), "file.delete", "فایل را حذف کرد", "file",
            f.ProjectId, f.Id, f.FileName);
        return NoContent();
    }
}
