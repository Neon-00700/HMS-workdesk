using System.Security.Claims;
using Hamyaran.Workdesk.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace Hamyaran.Workdesk.Api.Auth;

/* ─── Permission catalog (single source of truth) ─── */
public static class Perms
{
    public const string ProjectsView = "projects.view";
    public const string ProjectsCreate = "projects.create";
    public const string ProjectsEdit = "projects.edit";
    public const string ProjectsDelete = "projects.delete";
    public const string ProjectsManageMembers = "projects.manage_members";

    public const string BoardsView = "boards.view";
    public const string BoardsCreate = "boards.create";
    public const string BoardsEdit = "boards.edit";
    public const string BoardsDelete = "boards.delete";
    public const string BoardsManageColumns = "boards.manage_columns";

    public const string TasksView = "tasks.view";
    public const string TasksCreate = "tasks.create";
    public const string TasksEdit = "tasks.edit";
    public const string TasksDelete = "tasks.delete";
    public const string TasksAssign = "tasks.assign";
    public const string TasksMove = "tasks.move";
    public const string TasksManageDependencies = "tasks.manage_dependencies";

    public const string ChatView = "chat.view";
    public const string ChatSend = "chat.send";
    public const string ChatEdit = "chat.edit";
    public const string ChatDelete = "chat.delete";
    public const string ChatManage = "chat.manage";

    public const string FilesView = "files.view";
    public const string FilesUpload = "files.upload";
    public const string FilesDownload = "files.download";
    public const string FilesDelete = "files.delete";

    public const string ReportsView = "reports.view";
    public const string CalendarManage = "calendar.manage";

    public const string UsersView = "users.view";
    public const string UsersCreate = "users.create";
    public const string UsersEdit = "users.edit";
    public const string UsersDisable = "users.disable";
    public const string RolesManage = "roles.manage";
    public const string SystemSettings = "system.settings";
    public const string AuditView = "audit.view";

    public static readonly (string Key, string TitleFa, string Group)[] All =
    [
        (ProjectsView, "مشاهده پروژه‌ها", "پروژه‌ها"),
        (ProjectsCreate, "ایجاد پروژه", "پروژه‌ها"),
        (ProjectsEdit, "ویرایش پروژه", "پروژه‌ها"),
        (ProjectsDelete, "حذف پروژه", "پروژه‌ها"),
        (ProjectsManageMembers, "مدیریت اعضای پروژه", "پروژه‌ها"),
        (BoardsView, "مشاهده بوردها", "بوردها"),
        (BoardsCreate, "ایجاد بورد", "بوردها"),
        (BoardsEdit, "ویرایش بورد", "بوردها"),
        (BoardsDelete, "حذف بورد", "بوردها"),
        (BoardsManageColumns, "مدیریت ستون‌ها", "بوردها"),
        (TasksView, "مشاهده وظایف", "وظایف"),
        (TasksCreate, "ایجاد وظیفه", "وظایف"),
        (TasksEdit, "ویرایش وظیفه", "وظایف"),
        (TasksDelete, "حذف وظیفه", "وظایف"),
        (TasksAssign, "تخصیص وظیفه", "وظایف"),
        (TasksMove, "جابه‌جایی وظیفه", "وظایف"),
        (TasksManageDependencies, "مدیریت وابستگی‌ها", "وظایف"),
        (ChatView, "مشاهده گفتگوها", "گفتگو"),
        (ChatSend, "ارسال پیام", "گفتگو"),
        (ChatEdit, "ویرایش پیام", "گفتگو"),
        (ChatDelete, "حذف پیام", "گفتگو"),
        (ChatManage, "مدیریت گفتگوها", "گفتگو"),
        (FilesView, "مشاهده فایل‌ها", "فایل‌ها"),
        (FilesUpload, "آپلود فایل", "فایل‌ها"),
        (FilesDownload, "دانلود فایل", "فایل‌ها"),
        (FilesDelete, "حذف فایل", "فایل‌ها"),
        (ReportsView, "مشاهده گزارش‌ها", "گزارش و تقویم"),
        (CalendarManage, "مدیریت رویدادها", "گزارش و تقویم"),
        (UsersView, "مشاهده کاربران", "کاربران و مدیریت"),
        (UsersCreate, "ایجاد کاربر", "کاربران و مدیریت"),
        (UsersEdit, "ویرایش کاربر", "کاربران و مدیریت"),
        (UsersDisable, "غیرفعال‌سازی کاربر", "کاربران و مدیریت"),
        (RolesManage, "مدیریت نقش‌ها", "کاربران و مدیریت"),
        (SystemSettings, "تنظیمات سامانه", "کاربران و مدیریت"),
        (AuditView, "مشاهده لاگ حسابرسی", "کاربران و مدیریت"),
    ];
}

/* ─── Authorization requirement + handler (DB-backed) ─── */
public sealed class PermissionRequirement : IAuthorizationRequirement
{
    public string Permission { get; }
    public PermissionRequirement(string permission) => Permission = permission;
}

public sealed class PermissionHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly AppDbContext _db;
    public PermissionHandler(AppDbContext db) => _db = db;

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null || !Guid.TryParse(userId, out var uid)) return;

        var has = await _db.UserRoles
            .Where(ur => ur.UserId == uid)
            .SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.Permission.Key)
            .AnyAsync(k => k == requirement.Permission);

        // Project membership scoping is additionally enforced per-endpoint.
        if (has) context.Succeed(requirement);
    }
}

/* ─── [RequirePermission("tasks.create")] ─── */
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class RequirePermissionAttribute : AuthorizeAttribute
{
    public RequirePermissionAttribute(string permission) => Policy = $"perm:{permission}";
}

// Policy provider wiring (register in Program if using attribute; alternatively
// controllers call PermissionService directly). Kept minimal on purpose.
public static class ClaimsExtensions
{
    public static Guid UserId(this ClaimsPrincipal p) =>
        Guid.Parse(p.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
