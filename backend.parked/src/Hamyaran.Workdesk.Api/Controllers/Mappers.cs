using Hamyaran.Workdesk.Api.DTOs;
using Hamyaran.Workdesk.Api.Models;

namespace Hamyaran.Workdesk.Api.Controllers;

/* ─── Entity → DTO mapping (no lazy surprises; explicit includes at call-site) ─── */
public static class Mappers
{
    public static UserDto ToUserDto(User u, string role, string roleTitleFa,
        List<string> permissions, bool online) => new(
        u.Id, u.Name, u.Username, u.Email, u.AvatarPath, role, roleTitleFa,
        u.Department, u.Position, u.Status, online, u.LastSeenAt, permissions, u.CreatedAt);

    public static UserDto ToUserBrief(User u) => new(
        u.Id, u.Name, u.Username, u.Email, u.AvatarPath, "", "", u.Department,
        u.Position, u.Status, false, u.LastSeenAt, new(), u.CreatedAt);

    public static ProjectDto ToProjectDto(Project p, int progress, int members,
        int open, int overdue, int blocked, bool fav) => new(
        p.Id, p.Name, p.Key, p.Description, p.IconColor, p.Status, p.Health,
        p.OwnerId, p.StartDate, p.TargetDate, progress, members,
        open, overdue, blocked, p.LastActivityAt, fav);

    public static BoardDto ToBoardDto(Board b) => new(
        b.Id, b.ProjectId, b.Name, b.Kind, b.Description,
        b.Columns.OrderBy(c => c.Order)
            .Select(c => new ColumnDto(c.Id, c.BoardId, c.Title, c.Key, c.Color, c.Order, c.WipLimit, c.IsDoneColumn))
            .ToList(),
        b.IsDefault, b.CreatedAt);
}
