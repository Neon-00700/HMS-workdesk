using Hamyaran.Workdesk.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Hamyaran.Workdesk.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
    public DbSet<Board> Boards => Set<Board>();
    public DbSet<BoardColumn> BoardColumns => Set<BoardColumn>();
    public DbSet<Epic> Epics => Set<Epic>();
    public DbSet<Milestone> Milestones => Set<Milestone>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<TaskAssignee> TaskAssignees => Set<TaskAssignee>();
    public DbSet<TaskWatcher> TaskWatchers => Set<TaskWatcher>();
    public DbSet<Label> Labels => Set<Label>();
    public DbSet<TaskLabel> TaskLabels => Set<TaskLabel>();
    public DbSet<Subtask> Subtasks => Set<Subtask>();
    public DbSet<ChecklistItem> ChecklistItems => Set<ChecklistItem>();
    public DbSet<TaskDependency> TaskDependencies => Set<TaskDependency>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Attachment> Attachments => Set<Attachment>();
    public DbSet<TimeEntry> TimeEntries => Set<TimeEntry>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<ConversationMember> ConversationMembers => Set<ConversationMember>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<MessageReaction> MessageReactions => Set<MessageReaction>();
    public DbSet<MessageRead> MessageReads => Set<MessageRead>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<CalendarEvent> CalendarEvents => Set<CalendarEvent>();
    public DbSet<ProjectFile> ProjectFiles => Set<ProjectFile>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        // ── Identity ──
        b.Entity<User>(e =>
        {
            e.HasIndex(x => x.Username).IsUnique();
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Username).HasMaxLength(64);
            e.Property(x => x.Email).HasMaxLength(256);
            e.HasQueryFilter(x => !x.IsDeleted);
        });
        b.Entity<Role>(e => e.HasIndex(x => x.Name).IsUnique());
        b.Entity<Permission>(e => e.HasIndex(x => x.Key).IsUnique());
        b.Entity<UserRole>().HasKey(x => new { x.UserId, x.RoleId });
        b.Entity<RolePermission>().HasKey(x => new { x.RoleId, x.PermissionId });
        b.Entity<RefreshToken>(e =>
        {
            e.HasIndex(x => x.TokenHash).IsUnique();
            e.HasIndex(x => x.UserId);
        });

        // ── Projects ──
        b.Entity<Project>(e =>
        {
            e.HasIndex(x => x.Key);
            e.HasIndex(x => x.LastActivityAt);
            e.HasQueryFilter(x => !x.IsDeleted);
        });
        b.Entity<ProjectMember>(e =>
        {
            e.HasKey(x => new { x.ProjectId, x.UserId });
            e.HasIndex(x => x.UserId);
        });
        b.Entity<Board>().HasIndex(x => x.ProjectId);
        b.Entity<BoardColumn>().HasIndex(x => x.BoardId);
        b.Entity<Milestone>().HasIndex(x => x.ProjectId);
        b.Entity<Epic>().HasIndex(x => x.ProjectId);

        // ── Tasks ──
        b.Entity<TaskItem>(e =>
        {
            e.HasIndex(x => x.ProjectId);
            e.HasIndex(x => x.BoardId);
            e.HasIndex(x => x.ColumnId);
            e.HasIndex(x => x.DueDate);
            e.HasIndex(x => x.Status);
            e.Property(x => x.Title).HasMaxLength(300);
            e.HasQueryFilter(x => !x.IsArchived);
        });
        b.Entity<TaskAssignee>(e =>
        {
            e.HasKey(x => new { x.TaskId, x.UserId });
            e.HasIndex(x => x.UserId);
        });
        b.Entity<TaskWatcher>(e =>
        {
            e.HasKey(x => new { x.TaskId, x.UserId });
            e.HasIndex(x => x.UserId);
        });
        b.Entity<TaskLabel>().HasKey(x => new { x.TaskId, x.LabelId });
        b.Entity<Subtask>().HasIndex(x => x.TaskId);
        b.Entity<ChecklistItem>().HasIndex(x => x.TaskId);
        b.Entity<TaskDependency>(e =>
        {
            e.HasIndex(x => x.TaskId);
            e.HasIndex(x => x.DependsOnTaskId);
        });
        b.Entity<Comment>(e =>
        {
            e.HasIndex(x => x.TaskId);
            e.HasQueryFilter(x => !x.IsDeleted);
        });
        b.Entity<Attachment>().HasIndex(x => x.TaskId);
        b.Entity<TimeEntry>(e =>
        {
            e.HasIndex(x => x.TaskId);
            e.HasIndex(x => x.UserId);
        });

        // ── Chat ──
        b.Entity<Conversation>(e =>
        {
            e.HasIndex(x => x.ProjectId);
            e.HasIndex(x => x.UpdatedAt);
        });
        b.Entity<ConversationMember>(e =>
        {
            e.HasKey(x => new { x.ConversationId, x.UserId });
            e.HasIndex(x => x.UserId);
        });
        b.Entity<Message>(e =>
        {
            e.HasIndex(x => x.ConversationId);
            e.HasIndex(x => x.CreatedAt);
            e.HasQueryFilter(x => !x.IsDeleted);
        });
        b.Entity<MessageReaction>().HasKey(x => new { x.MessageId, x.UserId, x.Emoji });
        b.Entity<MessageRead>().HasKey(x => new { x.MessageId, x.UserId });

        // ── Misc ──
        b.Entity<Notification>(e =>
        {
            e.HasIndex(x => x.UserId);
            e.HasIndex(x => x.CreatedAt);
        });
        b.Entity<CalendarEvent>(e =>
        {
            e.HasIndex(x => x.ProjectId);
            e.HasIndex(x => x.StartsAt);
            e.HasQueryFilter(x => !x.IsDeleted);
        });
        b.Entity<ProjectFile>(e =>
        {
            e.HasIndex(x => x.ProjectId);
            e.HasIndex(x => x.Folder);
            e.HasQueryFilter(x => !x.IsDeleted);
        });
        b.Entity<ActivityLog>(e =>
        {
            e.HasIndex(x => x.ProjectId);
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => x.ActorId);
        });
    }
}
