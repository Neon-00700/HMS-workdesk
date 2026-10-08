namespace Hamyaran.Workdesk.Api.DTOs;

/* ─── Common ─── */
public sealed record Paged<T>(List<T> Items, int Total, int Page, int PageSize);
public sealed record IdResponse(Guid Id);

/* ─── Auth ─── */
public sealed record LoginRequest(string Username, string Password, bool Remember = false);
public sealed record AuthResponse(
    string AccessToken, string RefreshToken, DateTime ExpiresAt,
    UserDto User, bool MustChangePassword);
public sealed record RefreshRequest(string RefreshToken);
public sealed record ChangePasswordRequest(string Current, string Next);

/* ─── Users ─── */
public sealed record UserDto(
    Guid Id, string Name, string Username, string Email, string? AvatarUrl,
    string Role, string RoleTitleFa, string Department, string Position,
    string Status, bool IsOnline, DateTime? LastSeenAt,
    List<string> Permissions, DateTime CreatedAt);
public sealed record CreateUserRequest(
    string Name, string Username, string Email, string Password,
    string Role, string Department, string Position);
public sealed record UpdateUserRequest(
    string? Name, string? Role, string? Department, string? Position,
    string? Status, bool? ForcePasswordChange);
public sealed record RoleDto(Guid Id, string Name, string TitleFa, List<string> Permissions, int MembersCount);
public sealed record UpdateRoleRequest(List<string> Permissions);

/* ─── Projects ─── */
public sealed record ProjectDto(
    Guid Id, string Name, string Key, string Description, string IconColor,
    string Status, string Health, Guid OwnerId, DateTime StartDate, DateTime TargetDate,
    int Progress, int MembersCount, int OpenTasks, int OverdueTasks, int BlockedTasks,
    DateTime LastActivityAt, bool IsFavorite);
public sealed record CreateProjectRequest(string Name, string Key, string? Description, DateTime? TargetDate);
public sealed record UpdateProjectRequest(
    string? Name, string? Key, string? Description, string? IconColor,
    string? Status, string? Health, DateTime? TargetDate, bool? IsFavorite);
public sealed record ProjectMemberDto(Guid UserId, UserDto User, string RoleInProject, DateTime JoinedAt);
public sealed record AddMemberRequest(Guid UserId, string RoleInProject);
public sealed record MilestoneDto(Guid Id, Guid ProjectId, string Title, DateTime DueDate, bool IsDone, int Progress);
public sealed record EpicDto(Guid Id, Guid ProjectId, Guid? BoardId, string Title, string? Description, string Color, int Progress);

/* ─── Boards ─── */
public sealed record ColumnDto(Guid Id, Guid BoardId, string Title, string Key, string Color, int Order, int? WipLimit, bool IsDoneColumn);
public sealed record BoardDto(Guid Id, Guid ProjectId, string Name, string Kind, string? Description, List<ColumnDto> Columns, bool IsDefault, DateTime CreatedAt);
public sealed record CreateBoardRequest(string Name, string Kind = "custom");
public sealed record CreateColumnRequest(string Title, string Color = "#0ea5e9");
public sealed record UpdateColumnRequest(string? Title, string? Color, int? WipLimit);
public sealed record ReorderColumnsRequest(List<Guid> ColumnIds);

/* ─── Tasks ─── */
public sealed record LabelDto(Guid Id, string Name, string Color);
public sealed record SubtaskDto(Guid Id, string Title, bool IsDone, Guid? AssigneeId, DateTime? DueDate);
public sealed record ChecklistDto(Guid Id, string Text, bool IsDone);
public sealed record DependencyDto(Guid Id, Guid TaskId, Guid DependsOnTaskId, string Kind);
public sealed record CommentDto(Guid Id, Guid TaskId, Guid AuthorId, UserDto? Author, string Body, DateTime CreatedAt, DateTime UpdatedAt, bool Edited);
public sealed record AttachmentDto(Guid Id, Guid TaskId, string FileName, string MimeType, long SizeBytes, Guid UploadedById, UserDto? UploadedBy, int Version, DateTime CreatedAt);
public sealed record TimeEntryDto(Guid Id, Guid TaskId, Guid UserId, UserDto? User, int Minutes, string? Note, DateTime StartedAt, DateTime? EndedAt, bool IsRunning);
public sealed record TaskDto(
    Guid Id, Guid ProjectId, Guid BoardId, Guid ColumnId, Guid? EpicId, Guid? ParentId,
    string Title, string Description, string Status, string Priority,
    List<Guid> AssigneeIds, List<UserDto> Assignees, Guid? ReviewerId, UserDto? Reviewer,
    List<Guid> WatcherIds, Guid CreatorId, DateTime? StartDate, DateTime? DueDate,
    int? EstimateMinutes, int SpentMinutes, List<LabelDto> Labels, string? Stream,
    List<SubtaskDto> Subtasks, List<ChecklistDto> Checklist, List<DependencyDto> Dependencies,
    List<Guid> BlockedBy, List<Guid> Blocking, List<CommentDto> Comments,
    List<AttachmentDto> Attachments, List<TimeEntryDto> TimeEntries,
    int Progress, long Order, bool IsBlocked, DateTime CreatedAt, DateTime UpdatedAt);
public sealed record CreateTaskRequest(
    string Title, string? Description, Guid ProjectId, Guid BoardId, Guid ColumnId,
    string Priority = "medium", string? Stream = null, List<Guid>? AssigneeIds = null,
    Guid? ReviewerId = null, DateTime? DueDate = null, int? EstimateMinutes = null,
    Guid? EpicId = null, List<Guid>? LabelIds = null);
public sealed record UpdateTaskRequest(
    string? Title, string? Description, string? Priority, string? Stream,
    List<Guid>? AssigneeIds, Guid? ReviewerId, DateTime? DueDate, DateTime? StartDate,
    int? EstimateMinutes, int? Progress, List<Guid>? LabelIds);
public sealed record MoveTaskRequest(Guid ColumnId);
public sealed record MoveToBoardRequest(Guid BoardId, Guid ColumnId);
public sealed record AddCommentRequest(string Body);
public sealed record AddChecklistRequest(string Text);
public sealed record AddSubtaskRequest(string Title);
public sealed record AddDependencyRequest(Guid DependsOnTaskId, string Kind = "depends_on");
public sealed record LogTimeRequest(int Minutes, string? Note);

/* ─── Chat ─── */
public sealed record ConversationDto(
    Guid Id, string Kind, string Title, Guid? ProjectId, string? ChannelKey,
    List<Guid> MemberIds, List<UserDto> Members, MessageDto? LastMessage,
    int UnreadCount, bool IsPinned, bool IsMuted, object? Background, DateTime UpdatedAt);
public sealed record MessageDto(
    Guid Id, Guid ConversationId, Guid SenderId, UserDto? Sender, string Body,
    Guid? ReplyToId, MessageDto? ReplyTo, List<ReactionDto> Reactions,
    bool IsEdited, bool IsPinned, List<Guid> ReadByIds, DateTime CreatedAt, DateTime UpdatedAt);
public sealed record ReactionDto(string Emoji, List<Guid> UserIds);
public sealed record SendMessageRequest(string Body, Guid? ReplyToId);
public sealed record EditMessageRequest(string Body);
public sealed record ReactRequest(string Emoji);
public sealed record CreateGroupRequest(string Title, List<Guid> MemberIds);
public sealed record SetBackgroundRequest(string Type, string Value, double OverlayOpacity);

/* ─── Files / Calendar / Notifications / Reports / Activity ─── */
public sealed record ProjectFileDto(
    Guid Id, Guid ProjectId, string Folder, string FileName, string MimeType,
    long SizeBytes, int Version, Guid UploadedById, UserDto? UploadedBy,
    DateTime CreatedAt, DateTime UpdatedAt);
public sealed record RenameFileRequest(string FileName);
public sealed record MoveFileRequest(string Folder);
public sealed record CalendarEventDto(
    Guid Id, string Title, string Kind, Guid? ProjectId, Guid? TaskId,
    DateTime StartsAt, DateTime EndsAt, bool AllDay, string? Color, string? Description);
public sealed record CreateEventRequest(
    string Title, string Kind, Guid? ProjectId, DateTime StartsAt, DateTime EndsAt,
    bool AllDay = false, string? Color = null, string? Description = null);
public sealed record NotificationDto(
    Guid Id, string Type, string Title, string Body, string? Link, bool IsRead, DateTime CreatedAt);
public sealed record WorkloadRowDto(
    Guid UserId, UserDto User, int Assigned, int Completed, int Overdue,
    int EstimateMinutes, int SpentMinutes, int CapacityMinutes);
public sealed record BurnPointDto(string Date, int Remaining, int Ideal);
public sealed record StreamProgressDto(string Stream, int Total, int Done, int Progress);
public sealed record OverviewDto(
    int Total, int Completed, int InProgress, int Blocked, int Overdue, int DueSoon,
    int CompletionRate, int PlannedMinutes, int SpentMinutes);
public sealed record ActivityDto(
    Guid Id, Guid? ProjectId, Guid ActorId, UserDto? Actor, string Action,
    string ActionFa, string EntityType, Guid? EntityId, string? EntityTitle, DateTime CreatedAt);
public sealed record SearchResultsDto(
    List<ProjectDto> Projects, List<TaskDto> Tasks, List<UserDto> Users,
    List<ProjectFileDto> Files, List<MessageDto> Messages);
