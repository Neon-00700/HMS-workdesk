namespace Hamyaran.Workdesk.Api.Models;

/* ═══════════ Identity ═══════════ */
public class User
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Username { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string? AvatarPath { get; set; }
    public string Department { get; set; } = "";
    public string Position { get; set; } = "";
    public string? About { get; set; }
    public string Status { get; set; } = "active"; // active|invited|disabled
    public bool ForcePasswordChange { get; set; }
    public DateTime? LastSeenAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; }
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}

public class Role
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string TitleFa { get; set; } = "";
    public bool IsSystem { get; set; }
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

public class Permission
{
    public Guid Id { get; set; }
    public string Key { get; set; } = ""; // e.g. tasks.create
    public string TitleFa { get; set; } = "";
    public string Group { get; set; } = "";
}

public class UserRole
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Guid RoleId { get; set; }
    public Role Role { get; set; } = null!;
}

public class RolePermission
{
    public Guid RoleId { get; set; }
    public Role Role { get; set; } = null!;
    public Guid PermissionId { get; set; }
    public Permission Permission { get; set; } = null!;
}

public class RefreshToken
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string TokenHash { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAt { get; set; }
    public string? Device { get; set; }
    public string? Ip { get; set; }
}

/* ═══════════ Projects ═══════════ */
public class Project
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Key { get; set; } = "";
    public string Description { get; set; } = "";
    public string IconColor { get; set; } = "#16a34a";
    public string Status { get; set; } = "active";
    public string Health { get; set; } = "on_track";
    public Guid OwnerId { get; set; }
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime TargetDate { get; set; }
    public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; }
    public ICollection<ProjectMember> Members { get; set; } = new List<ProjectMember>();
    public ICollection<Board> Boards { get; set; } = new List<Board>();
}

public class ProjectMember
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string RoleInProject { get; set; } = "";
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}

public class Board
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public string Name { get; set; } = "";
    public string Kind { get; set; } = "custom"; // main|urgent|custom
    public string? Description { get; set; }
    public bool IsDefault { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<BoardColumn> Columns { get; set; } = new List<BoardColumn>();
}

public class BoardColumn
{
    public Guid Id { get; set; }
    public Guid BoardId { get; set; }
    public Board Board { get; set; } = null!;
    public string Title { get; set; } = "";
    public string Key { get; set; } = "";
    public string Color { get; set; } = "#0ea5e9";
    public int Order { get; set; }
    public int? WipLimit { get; set; }
    public bool IsDoneColumn { get; set; }
}

public class Epic
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Guid? BoardId { get; set; }
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public string Color { get; set; } = "#16a34a";
}

public class Milestone
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string Title { get; set; } = "";
    public DateTime DueDate { get; set; }
    public bool IsDone { get; set; }
    public int Progress { get; set; }
}

/* ═══════════ Tasks ═══════════ */
public class TaskItem
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public Guid BoardId { get; set; }
    public Guid ColumnId { get; set; }
    public Guid? EpicId { get; set; }
    public Guid? ParentId { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Status { get; set; } = "backlog";
    public string Priority { get; set; } = "medium";
    public Guid? ReviewerId { get; set; }
    public Guid CreatorId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }
    public int? EstimateMinutes { get; set; }
    public int SpentMinutes { get; set; }
    public string? Stream { get; set; }
    public int Progress { get; set; }
    public long Order { get; set; }
    public bool IsBlocked { get; set; }
    public bool IsArchived { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<TaskAssignee> Assignees { get; set; } = new List<TaskAssignee>();
    public ICollection<TaskWatcher> Watchers { get; set; } = new List<TaskWatcher>();
    public ICollection<TaskLabel> Labels { get; set; } = new List<TaskLabel>();
    public ICollection<Subtask> Subtasks { get; set; } = new List<Subtask>();
    public ICollection<ChecklistItem> Checklist { get; set; } = new List<ChecklistItem>();
    public ICollection<TaskDependency> Dependencies { get; set; } = new List<TaskDependency>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
    public ICollection<TimeEntry> TimeEntries { get; set; } = new List<TimeEntry>();
}

public class TaskAssignee
{
    public Guid TaskId { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
}

public class TaskWatcher
{
    public Guid TaskId { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
}

public class Label
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Color { get; set; } = "#64748b";
}

public class TaskLabel
{
    public Guid TaskId { get; set; }
    public Guid LabelId { get; set; }
    public Label Label { get; set; } = null!;
}

public class Subtask
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public string Title { get; set; } = "";
    public bool IsDone { get; set; }
    public Guid? AssigneeId { get; set; }
    public DateTime? DueDate { get; set; }
}

public class ChecklistItem
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public string Text { get; set; } = "";
    public bool IsDone { get; set; }
}

public class TaskDependency
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public Guid DependsOnTaskId { get; set; }
    public string Kind { get; set; } = "depends_on";
}

public class Comment
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public Guid AuthorId { get; set; }
    public User Author { get; set; } = null!;
    public string Body { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; }
}

public class Attachment
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public string FileName { get; set; } = "";
    public string StoredName { get; set; } = "";
    public string MimeType { get; set; } = "";
    public long SizeBytes { get; set; }
    public Guid UploadedById { get; set; }
    public int Version { get; set; } = 1;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class TimeEntry
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public int Minutes { get; set; }
    public string? Note { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
}

/* ═══════════ Chat ═══════════ */
public class Conversation
{
    public Guid Id { get; set; }
    public string Kind { get; set; } = "dm"; // project_channel|dm|group
    public string Title { get; set; } = "";
    public Guid? ProjectId { get; set; }
    public string? ChannelKey { get; set; }
    public string BackgroundJson { get; set; } = "{}";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<ConversationMember> Members { get; set; } = new List<ConversationMember>();
}

public class ConversationMember
{
    public Guid ConversationId { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public int UnreadCount { get; set; }
    public bool IsMuted { get; set; }
    public bool IsPinned { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}

public class Message
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public Guid SenderId { get; set; }
    public User Sender { get; set; } = null!;
    public string Body { get; set; } = "";
    public Guid? ReplyToId { get; set; }
    public bool IsEdited { get; set; }
    public bool IsPinned { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<MessageReaction> Reactions { get; set; } = new List<MessageReaction>();
    public ICollection<MessageRead> Reads { get; set; } = new List<MessageRead>();
}

public class MessageReaction
{
    public Guid MessageId { get; set; }
    public Guid UserId { get; set; }
    public string Emoji { get; set; } = "";
}

public class MessageRead
{
    public Guid MessageId { get; set; }
    public Guid UserId { get; set; }
    public DateTime ReadAt { get; set; } = DateTime.UtcNow;
}

/* ═══════════ Misc ═══════════ */
public class Notification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Type { get; set; } = "";
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string? Link { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class CalendarEvent
{
    public Guid Id { get; set; }
    public string Title { get; set; } = "";
    public string Kind { get; set; } = "meeting";
    public Guid? ProjectId { get; set; }
    public Guid? TaskId { get; set; }
    public DateTime StartsAt { get; set; }
    public DateTime EndsAt { get; set; }
    public bool AllDay { get; set; }
    public string? Color { get; set; }
    public string? Description { get; set; }
    public Guid CreatedById { get; set; }
    public bool IsDeleted { get; set; }
}

public class ProjectFile
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string Folder { get; set; } = "";
    public string FileName { get; set; } = "";
    public string StoredName { get; set; } = "";
    public string MimeType { get; set; } = "";
    public long SizeBytes { get; set; }
    public int Version { get; set; } = 1;
    public Guid UploadedById { get; set; }
    public User UploadedBy { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; }
}

public class ActivityLog
{
    public Guid Id { get; set; }
    public Guid? ProjectId { get; set; }
    public Guid ActorId { get; set; }
    public User Actor { get; set; } = null!;
    public string Action { get; set; } = "";
    public string ActionFa { get; set; } = "";
    public string EntityType { get; set; } = "";
    public Guid? EntityId { get; set; }
    public string? EntityTitle { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
