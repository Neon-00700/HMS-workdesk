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
public sealed class ChatController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly PermissionService _perms;

    public ChatController(AppDbContext db, PermissionService perms) { _db = db; _perms = perms; }

    private async Task<MessageDto> MessageToDtoAsync(Message m)
    {
        var sender = await _db.Users.FindAsync(m.SenderId);
        var reactions = await _db.MessageReactions.Where(r => r.MessageId == m.Id).ToListAsync();
        var reads = await _db.MessageReads.Where(r => r.MessageId == m.Id).Select(r => r.UserId).ToListAsync();
        MessageDto? reply = null;
        if (m.ReplyToId is not null)
        {
            var rm = await _db.Messages.FindAsync(m.ReplyToId);
            if (rm is not null) reply = await MessageToDtoAsync(rm);
        }
        return new MessageDto(m.Id, m.ConversationId, m.SenderId,
            sender is null ? null : Mappers.ToUserBrief(sender), m.Body, m.ReplyToId, reply,
            reactions.GroupBy(r => r.Emoji)
                .Select(g => new ReactionDto(g.Key, g.Select(x => x.UserId).ToList())).ToList(),
            m.IsEdited, m.IsPinned, reads, m.CreatedAt, m.UpdatedAt);
    }

    [HttpGet("conversations")]
    [RequirePermission(Perms.ChatView)]
    public async Task<ActionResult<List<ConversationDto>>> Conversations()
    {
        var uid = User.UserId();
        var convos = await _db.ConversationMembers.Where(m => m.UserId == uid)
            .Select(m => m.ConversationId).ToListAsync();
        var list = await _db.Conversations.Where(c => convos.Contains(c.Id))
            .Include(c => c.Members).ThenInclude(m => m.User)
            .OrderByDescending(c => c.UpdatedAt).ToListAsync();
        var out_ = new List<ConversationDto>();
        foreach (var c in list)
        {
            var last = await _db.Messages.Where(m => m.ConversationId == c.Id && !m.IsDeleted)
                .OrderByDescending(m => m.CreatedAt).FirstOrDefaultAsync();
            var me = c.Members.First(m => m.UserId == uid);
            out_.Add(new ConversationDto(c.Id, c.Kind, c.Title, c.ProjectId, c.ChannelKey,
                c.Members.Select(m => m.UserId).ToList(),
                c.Members.Select(m => Mappers.ToUserBrief(m.User)).ToList(),
                last is null ? null : await MessageToDtoAsync(last),
                me.UnreadCount, me.IsPinned, me.IsMuted, null, c.UpdatedAt));
        }
        return Ok(out_);
    }

    [HttpGet("conversations/{id:guid}/messages")]
    [RequirePermission(Perms.ChatView)]
    public async Task<ActionResult<List<MessageDto>>> Messages(Guid id,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        if (!await _perms.IsConversationMemberAsync(User.UserId(), id))
            throw new ApiException("forbidden", "عضو این گفتگو نیستید.", 403);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var msgs = await _db.Messages.Where(m => m.ConversationId == id && !m.IsDeleted)
            .OrderBy(m => m.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var out_ = new List<MessageDto>();
        foreach (var m in msgs) out_.Add(await MessageToDtoAsync(m));
        return Ok(out_);
    }

    [HttpPost("conversations/{id:guid}/messages")]
    [RequirePermission(Perms.ChatSend)]
    public async Task<ActionResult<MessageDto>> Send(Guid id, [FromBody] SendMessageRequest req)
    {
        var uid = User.UserId();
        if (!await _perms.IsConversationMemberAsync(uid, id))
            throw new ApiException("forbidden", "عضو این گفتگو نیستید.", 403);
        if (string.IsNullOrWhiteSpace(req.Body) || req.Body.Length > 4000)
            throw new ApiException("invalid", "متن پیام نامعتبر است.", 400);
        var m = new Message
        { ConversationId = id, SenderId = uid, Body = req.Body.Trim(), ReplyToId = req.ReplyToId };
        _db.Messages.Add(m);
        _db.MessageReads.Add(new MessageRead { MessageId = m.Id, UserId = uid });
        var convo = await _db.Conversations.Include(c => c.Members).FirstAsync(c => c.Id == id);
        convo.UpdatedAt = DateTime.UtcNow;
        foreach (var member in convo.Members.Where(x => x.UserId != uid))
            member.UnreadCount++;
        await _db.SaveChangesAsync();
        return Ok(await MessageToDtoAsync(m));
    }

    [HttpPatch("messages/{id:guid}")]
    [RequirePermission(Perms.ChatEdit)]
    public async Task<ActionResult<MessageDto>> Edit(Guid id, [FromBody] EditMessageRequest req)
    {
        var m = await _db.Messages.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (m is null) throw new ApiException("not_found", "پیام یافت نشد.", 404);
        if (m.SenderId != User.UserId())
            throw new ApiException("forbidden", "فقط فرستنده می‌تواند ویرایش کند.", 403);
        m.Body = req.Body.Trim();
        m.IsEdited = true;
        m.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(await MessageToDtoAsync(m));
    }

    [HttpDelete("messages/{id:guid}")]
    [RequirePermission(Perms.ChatDelete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var m = await _db.Messages.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (m is null) throw new ApiException("not_found", "پیام یافت نشد.", 404);
        if (m.SenderId != User.UserId() && !User.HasClaim("perm", Perms.ChatManage))
            throw new ApiException("forbidden", "اجازه حذف ندارید.", 403);
        m.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("messages/{id:guid}/react")]
    [RequirePermission(Perms.ChatSend)]
    public async Task<ActionResult<MessageDto>> React(Guid id, [FromBody] ReactRequest req)
    {
        var uid = User.UserId();
        var m = await _db.Messages.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (m is null) throw new ApiException("not_found", "پیام یافت نشد.", 404);
        var existing = await _db.MessageReactions
            .FirstOrDefaultAsync(r => r.MessageId == id && r.UserId == uid && r.Emoji == req.Emoji);
        if (existing is null)
            _db.MessageReactions.Add(new MessageReaction { MessageId = id, UserId = uid, Emoji = req.Emoji });
        else
            _db.MessageReactions.Remove(existing);
        await _db.SaveChangesAsync();
        return Ok(await MessageToDtoAsync(m));
    }

    [HttpPost("messages/{id:guid}/pin")]
    [RequirePermission(Perms.ChatSend)]
    public async Task<ActionResult<MessageDto>> TogglePin(Guid id)
    {
        var m = await _db.Messages.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (m is null) throw new ApiException("not_found", "پیام یافت نشد.", 404);
        m.IsPinned = !m.IsPinned;
        await _db.SaveChangesAsync();
        return Ok(await MessageToDtoAsync(m));
    }

    [HttpPost("conversations/{id:guid}/read")]
    [RequirePermission(Perms.ChatView)]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var uid = User.UserId();
        var member = await _db.ConversationMembers
            .FirstOrDefaultAsync(x => x.ConversationId == id && x.UserId == uid);
        if (member is null) throw new ApiException("forbidden", "عضو این گفتگو نیستید.", 403);
        member.UnreadCount = 0;
        var msgIds = await _db.Messages.Where(m => m.ConversationId == id).Select(m => m.Id).ToListAsync();
        var existing = await _db.MessageReads
            .Where(r => r.UserId == uid && msgIds.Contains(r.MessageId)).Select(r => r.MessageId).ToListAsync();
        foreach (var mid in msgIds.Where(x => !existing.Contains(x)))
            _db.MessageReads.Add(new MessageRead { MessageId = mid, UserId = uid });
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("groups")]
    [RequirePermission(Perms.ChatSend)]
    public async Task<ActionResult<ConversationDto>> CreateGroup([FromBody] CreateGroupRequest req)
    {
        var uid = User.UserId();
        var c = new Conversation { Kind = "group", Title = req.Title };
        _db.Conversations.Add(c);
        _db.ConversationMembers.Add(new ConversationMember { ConversationId = c.Id, UserId = uid });
        foreach (var mid in req.MemberIds.Distinct().Where(x => x != uid))
            _db.ConversationMembers.Add(new ConversationMember { ConversationId = c.Id, UserId = mid });
        await _db.SaveChangesAsync();
        var convos = await Conversations();
        return Ok(convos.Value!.First(x => x.Id == c.Id));
    }

    [HttpPut("conversations/{id:guid}/background")]
    [RequirePermission(Perms.ChatSend)]
    public async Task<IActionResult> SetBackground(Guid id, [FromBody] SetBackgroundRequest req)
    {
        var c = await _db.Conversations.FindAsync(id);
        if (c is null) throw new ApiException("not_found", "گفتگو یافت نشد.", 404);
        if (!await _perms.IsConversationMemberAsync(User.UserId(), id))
            throw new ApiException("forbidden", "عضو این گفتگو نیستید.", 403);
        c.BackgroundJson = System.Text.Json.JsonSerializer.Serialize(req);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("conversations/{id:guid}/mute")]
    [RequirePermission(Perms.ChatView)]
    public async Task<IActionResult> ToggleMute(Guid id)
    {
        var member = await _db.ConversationMembers
            .FirstOrDefaultAsync(x => x.ConversationId == id && x.UserId == User.UserId());
        if (member is null) throw new ApiException("forbidden", "عضو این گفتگو نیستید.", 403);
        member.IsMuted = !member.IsMuted;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
