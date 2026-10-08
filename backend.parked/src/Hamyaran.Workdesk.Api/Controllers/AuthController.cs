using Hamyaran.Workdesk.Api.Auth;
using Hamyaran.Workdesk.Api.Data;
using Hamyaran.Workdesk.Api.DTOs;
using Hamyaran.Workdesk.Api.Middleware;
using Hamyaran.Workdesk.Api.Models;
using Hamyaran.Workdesk.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Hamyaran.Workdesk.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher<object> _hasher;
    private readonly TokenService _tokens;
    private readonly PermissionService _perms;
    private readonly AuditService _audit;
    private readonly IConfiguration _cfg;

    public AuthController(AppDbContext db, IPasswordHasher<object> hasher, TokenService tokens,
        PermissionService perms, AuditService audit, IConfiguration cfg)
    {
        _db = db; _hasher = hasher; _tokens = tokens;
        _perms = perms; _audit = audit; _cfg = cfg;
    }

    [HttpPost("login")]
    [EnableRateLimiting("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest req)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => (u.Username == req.Username || u.Email == req.Username)
                && u.Status == "active" && !u.IsDeleted);
        if (user is null) throw new ApiException("invalid_credentials", "نام کاربری یا رمز عبور اشتباه است.", 401);

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);
        if (result == PasswordVerificationResult.Failed)
            throw new ApiException("invalid_credentials", "نام کاربری یا رمز عبور اشتباه است.", 401);

        var permissions = await _perms.ForUserAsync(user.Id);
        var access = _tokens.CreateAccessToken(user, permissions);
        var (refresh, hash) = TokenService.CreateRefreshToken();
        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = hash,
            ExpiresAt = DateTime.UtcNow.AddDays(int.Parse(_cfg.GetSection("Jwt")["RefreshTokenDays"] ?? "14")),
            Device = Request.Headers.UserAgent.ToString()[..Math.Min(200, Request.Headers.UserAgent.ToString().Length)],
            Ip = HttpContext.Connection.RemoteIpAddress?.ToString(),
        });
        user.LastSeenAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _audit.LogAsync(user.Id, "auth.login", "وارد سامانه شد", "session");

        return Ok(new AuthResponse(access, refresh,
            DateTime.UtcNow.AddMinutes(int.Parse(_cfg.GetSection("Jwt")["AccessTokenMinutes"] ?? "15")),
            Mappers.ToUserDto(user, "", "", permissions, false), user.ForcePasswordChange));
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh([FromBody] RefreshRequest req)
    {
        var hash = TokenService.Hash(req.RefreshToken);
        var stored = await _db.RefreshTokens
            .FirstOrDefaultAsync(r => r.TokenHash == hash && r.RevokedAt == null);
        if (stored is null || stored.ExpiresAt < DateTime.UtcNow)
            throw new ApiException("invalid_token", "نشست منقضی شده است؛ دوباره وارد شوید.", 401);

        var user = await _db.Users.FindAsync(stored.UserId);
        if (user is null || user.Status != "active")
            throw new ApiException("invalid_token", "حساب کاربری معتبر نیست.", 401);

        // Rotate: revoke old, issue new
        stored.RevokedAt = DateTime.UtcNow;
        var (refresh, newHash) = TokenService.CreateRefreshToken();
        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id, TokenHash = newHash,
            ExpiresAt = DateTime.UtcNow.AddDays(int.Parse(_cfg.GetSection("Jwt")["RefreshTokenDays"] ?? "14")),
        });
        await _db.SaveChangesAsync();

        var permissions = await _perms.ForUserAsync(user.Id);
        var access = _tokens.CreateAccessToken(user, permissions);
        return Ok(new AuthResponse(access, refresh, DateTime.UtcNow.AddMinutes(15),
            Mappers.ToUserDto(user, "", "", permissions, false), user.ForcePasswordChange));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest? req)
    {
        if (req is not null)
        {
            var hash = TokenService.Hash(req.RefreshToken);
            var stored = await _db.RefreshTokens.FirstOrDefaultAsync(r => r.TokenHash == hash);
            if (stored is not null) stored.RevokedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User.UserId(), "auth.logout", "از سامانه خارج شد", "session");
        return NoContent();
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
    {
        if (req.Next.Length < 8)
            throw new ApiException("weak_password", "رمز جدید باید حداقل ۸ کاراکتر باشد.", 422);
        var user = await _db.Users.FindAsync(User.UserId());
        if (user is null) throw new ApiException("not_found", "کاربر یافت نشد.", 404);
        if (_hasher.VerifyHashedPassword(user, user.PasswordHash, req.Current) == PasswordVerificationResult.Failed)
            throw new ApiException("wrong_password", "رمز فعلی اشتباه است.", 400);
        user.PasswordHash = _hasher.HashPassword(user, req.Next);
        user.ForcePasswordChange = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        var user = await _db.Users.FindAsync(User.UserId());
        if (user is null) throw new ApiException("not_found", "کاربر یافت نشد.", 404);
        var permissions = await _perms.ForUserAsync(user.Id);
        var role = await _db.UserRoles.Where(ur => ur.UserId == user.Id)
            .Select(ur => ur.Role).FirstOrDefaultAsync();
        return Ok(Mappers.ToUserDto(user, role?.Name ?? "", role?.TitleFa ?? "", permissions, true));
    }
}
