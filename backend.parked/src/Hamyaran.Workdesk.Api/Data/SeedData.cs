using Hamyaran.Workdesk.Api.Auth;
using Hamyaran.Workdesk.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Hamyaran.Workdesk.Api.Data;

/* ─── Development seed: permissions, roles, admin user ───
   Rich demo content (projects/tasks) lives in the frontend demo adapter
   and mirrors this contract. Extend here for backend-driven demos. */
public static class SeedData
{
    public static async Task EnsureSeededAsync(IServiceProvider sp)
    {
        var db = sp.GetRequiredService<AppDbContext>();
        var hasher = sp.GetRequiredService<IPasswordHasher<object>>();

        // Permissions
        foreach (var (key, titleFa, group) in Perms.All)
            if (!await db.Permissions.AnyAsync(p => p.Key == key))
                db.Permissions.Add(new Permission { Key = key, TitleFa = titleFa, Group = group });
        await db.SaveChangesAsync();
        var permIds = await db.Permissions.ToDictionaryAsync(p => p.Key, p => p.Id);

        async Task<Role> EnsureRole(string name, string titleFa, string[] keys)
        {
            var role = await db.Roles.Include(r => r.RolePermissions)
                .FirstOrDefaultAsync(r => r.Name == name);
            if (role is null)
            {
                role = new Role { Name = name, TitleFa = titleFa, IsSystem = true };
                db.Roles.Add(role);
                await db.SaveChangesAsync();
            }
            var have = role.RolePermissions.Select(rp => rp.PermissionId).ToHashSet();
            foreach (var k in keys)
                if (permIds.TryGetValue(k, out var pid) && !have.Contains(pid))
                    db.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = pid });
            await db.SaveChangesAsync();
            return role;
        }

        var all = Perms.All.Select(p => p.Key).ToArray();
        var base_ = new[]
        {
            Perms.ProjectsView, Perms.BoardsView, Perms.TasksView, Perms.TasksCreate,
            Perms.TasksEdit, Perms.ChatView, Perms.ChatSend, Perms.FilesView,
            Perms.FilesDownload, Perms.UsersView,
        };
        var admin = await EnsureRole("Admin", "مدیر سامانه", all);
        await EnsureRole("Project Owner", "مالک پروژه", all.Where(k => k is not
            ("users.create" or "users.disable" or "roles.manage" or "system.settings" or "audit.view")).ToArray());
        await EnsureRole("Project Manager", "مدیر پروژه", base_.Concat([
            Perms.ProjectsEdit, Perms.ProjectsManageMembers, Perms.BoardsCreate, Perms.BoardsEdit,
            Perms.BoardsManageColumns, Perms.TasksDelete, Perms.TasksAssign, Perms.TasksMove,
            Perms.TasksManageDependencies, Perms.ChatEdit, Perms.ChatDelete, Perms.ChatManage,
            Perms.FilesUpload, Perms.FilesDelete, Perms.ReportsView, Perms.CalendarManage,
        ]).ToArray());
        await EnsureRole("Team Lead", "سرپرست تیم", base_.Concat([
            Perms.BoardsEdit, Perms.BoardsManageColumns, Perms.TasksAssign, Perms.TasksMove,
            Perms.TasksManageDependencies, Perms.FilesUpload, Perms.ReportsView, Perms.CalendarManage,
        ]).ToArray());
        await EnsureRole("Developer", "توسعه‌دهنده", base_.Concat([
            Perms.TasksMove, Perms.ChatEdit, Perms.ChatDelete, Perms.FilesUpload, Perms.CalendarManage,
        ]).ToArray());
        await EnsureRole("Designer", "طراح", base_.Concat([
            Perms.TasksMove, Perms.ChatEdit, Perms.ChatDelete, Perms.FilesUpload,
        ]).ToArray());
        await EnsureRole("QA", "کارشناس تست", base_.Concat([
            Perms.TasksMove, Perms.ChatEdit, Perms.ChatDelete, Perms.FilesUpload,
        ]).ToArray());
        await EnsureRole("DevOps", "کارشناس زیرساخت", base_.Concat([
            Perms.TasksMove, Perms.ChatEdit, Perms.ChatDelete, Perms.FilesUpload,
        ]).ToArray());
        await EnsureRole("Employee", "کارمند", base_);
        await EnsureRole("Observer", "ناظر",
            [Perms.ProjectsView, Perms.BoardsView, Perms.TasksView, Perms.ChatView, Perms.FilesView, Perms.UsersView]);

        // Default admin: sara.m / ChangeMe123! (force change on first login)
        if (!await db.Users.AnyAsync(u => u.Username == "sara.m"))
        {
            var user = new User
            {
                Name = "سارا محمدی", Username = "sara.m", Email = "sara@hamyaran.local",
                Department = "مدیریت محصول", Position = "مدیر پروژه ارشد",
                Status = "active", ForcePasswordChange = true,
            };
            user.PasswordHash = hasher.HashPassword(user, "ChangeMe123!");
            db.Users.Add(user);
            await db.SaveChangesAsync();
            db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = admin.Id });
            await db.SaveChangesAsync();
        }

        // Labels
        foreach (var (name, color) in new[]
                 { ("باگ", "#dc2626"), ("قابلیت", "#16a34a"), ("رابط کاربری", "#0ea5e9"),
                   ("API", "#8b5cf6"), ("فوری", "#f97316"), ("مستندات", "#64748b"),
                   ("پرفورمنس", "#14b8a6"), ("امنیت", "#a21caf") })
            if (!await db.Labels.AnyAsync(l => l.Name == name))
                db.Labels.Add(new Label { Name = name, Color = color });
        await db.SaveChangesAsync();
    }
}
