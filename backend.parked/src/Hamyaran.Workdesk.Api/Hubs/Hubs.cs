using System.Security.Claims;
using Hamyaran.Workdesk.Api.Data;
using Hamyaran.Workdesk.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Hamyaran.Workdesk.Api.Hubs;

[Authorize]
public sealed class WorkspaceHub : Hub
{
    private readonly PresenceService _presence;
    private readonly AppDbContext _db;

    public WorkspaceHub(PresenceService presence, AppDbContext db)
    {
        _presence = presence;
        _db = db;
    }

    private Guid UserId => Guid.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public override async Task OnConnectedAsync()
    {
        _presence.Connected(UserId, Context.ConnectionId);
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{UserId}");
        // Join member project groups for board/task pushes
        var pids = await _db.ProjectMembers.Where(m => m.UserId == UserId)
            .Select(m => m.ProjectId).ToListAsync();
        foreach (var pid in pids)
            await Groups.AddToGroupAsync(Context.ConnectionId, $"project:{pid}");
        await Clients.All.SendAsync("presence", new { userId = UserId, online = true });
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? ex)
    {
        _presence.Disconnected(UserId, Context.ConnectionId);
        if (!_presence.IsOnline(UserId))
            await Clients.All.SendAsync("presence", new { userId = UserId, online = false });
        await base.OnDisconnectedAsync(ex);
    }

    public Task JoinConversation(string conversationId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, $"conv:{conversationId}");

    public Task LeaveConversation(string conversationId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, $"conv:{conversationId}");

    public Task Typing(string conversationId) =>
        Clients.Group($"conv:{conversationId}")
            .SendAsync("typing", new { conversationId, userId = UserId });
}

[Authorize]
public sealed class ChatHub : Hub
{
    // Dedicated hub for chat-heavy traffic; same auth + groups pattern.
    public Task JoinConversation(string conversationId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, $"conv:{conversationId}");

    public Task Typing(string conversationId, Guid userId) =>
        Clients.Group($"conv:{conversationId}")
            .SendAsync("typing", new { conversationId, userId });
}
