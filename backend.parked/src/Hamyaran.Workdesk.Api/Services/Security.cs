using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Hamyaran.Workdesk.Api.Data;
using Hamyaran.Workdesk.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace Hamyaran.Workdesk.Api.Services;

public sealed class TokenService
{
    private readonly IConfiguration _cfg;
    public TokenService(IConfiguration cfg) => _cfg = cfg;

    public string CreateAccessToken(User user, IEnumerable<string> permissions)
    {
        var jwt = _cfg.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!));
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Email, user.Email),
        };
        claims.AddRange(permissions.Select(p => new Claim("perm", p)));
        var token = new JwtSecurityToken(
            issuer: jwt["Issuer"],
            audience: jwt["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(int.Parse(jwt["AccessTokenMinutes"] ?? "15")),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public static (string Token, string Hash) CreateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        var token = Convert.ToBase64String(bytes);
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
        return (token, hash);
    }

    public static string Hash(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}

public sealed class PermissionService
{
    private readonly AppDbContext _db;
    public PermissionService(AppDbContext db) => _db = db;

    public Task<List<string>> ForUserAsync(Guid userId) =>
        _db.UserRoles.Where(ur => ur.UserId == userId)
            .SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.Permission.Key)
            .Distinct()
            .ToListAsync();

    public async Task<bool> IsProjectMemberAsync(Guid userId, Guid projectId) =>
        await _db.ProjectMembers.AnyAsync(m => m.UserId == userId && m.ProjectId == projectId);

    public async Task<bool> IsConversationMemberAsync(Guid userId, Guid conversationId) =>
        await _db.ConversationMembers.AnyAsync(m => m.UserId == userId && m.ConversationId == conversationId);
}

public sealed class AuditService
{
    private readonly AppDbContext _db;
    public AuditService(AppDbContext db) => _db = db;

    public async Task LogAsync(Guid actorId, string action, string actionFa, string entityType,
        Guid? projectId = null, Guid? entityId = null, string? entityTitle = null)
    {
        _db.ActivityLogs.Add(new ActivityLog
        {
            ActorId = actorId, Action = action, ActionFa = actionFa, EntityType = entityType,
            ProjectId = projectId, EntityId = entityId, EntityTitle = entityTitle,
        });
        await _db.SaveChangesAsync();
    }
}
