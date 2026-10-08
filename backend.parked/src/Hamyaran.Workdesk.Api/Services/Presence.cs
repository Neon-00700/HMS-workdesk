using System.Collections.Concurrent;

namespace Hamyaran.Workdesk.Api.Services;

/* ─── Online presence (in-memory; swap to Redis in multi-node) ─── */
public sealed class PresenceService
{
    private readonly ConcurrentDictionary<Guid, ConcurrentDictionary<string, byte>> _connections = new();

    public void Connected(Guid userId, string connectionId) =>
        _connections.GetOrAdd(userId, _ => new()).TryAdd(connectionId, 0);

    public void Disconnected(Guid userId, string connectionId)
    {
        if (_connections.TryGetValue(userId, out var set))
        {
            set.TryRemove(connectionId, out _);
            if (set.IsEmpty) _connections.TryRemove(userId, out _);
        }
    }

    public bool IsOnline(Guid userId) => _connections.ContainsKey(userId);
    public int OnlineCount => _connections.Count;
}
