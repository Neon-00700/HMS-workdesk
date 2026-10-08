# Hamyaran Workdesk — Backend

ASP.NET Core 8 Web API · EF Core + SQL Server · SignalR · Redis · JWT.

## Run locally

Requirements: .NET 8 SDK, SQL Server, Redis (or use `docker compose` from repo root).

```bash
cd src/Hamyaran.Workdesk.Api
dotnet ef database update        # apply migrations (or auto-applied in Development)
dotnet run
```

API: http://localhost:5190 · Swagger (Development only): http://localhost:5190/swagger

Default admin (seeded in Development): `sara.m` / `ChangeMe123!`
(forced password change on first login).

## Configuration

Environment variables (see root `.env.example`):

- `ConnectionStrings__Default` — SQL Server
- `ConnectionStrings__Redis` — Redis (cache + SignalR backplane)
- `Jwt__Key` — ≥32-char secret
- `Cors__Origins__0` — frontend origin (narrow)
- `Storage__RootPath` — file storage outside web root

## API surface

| area | routes |
|---|---|
| auth | `POST /api/auth/login|refresh|logout|change-password`, `GET /api/auth/me` |
| users/roles | `GET/POST /api/users`, `PATCH /api/users/{id}`, `GET /api/roles`, `PUT /api/roles/{id}/permissions` |
| projects | `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/{id}`, `/members`, `/activity`, `/milestones`, `/epics` |
| boards | `GET/POST /api/projects/{pid}/boards`, `/api/boards/{id}`, `/columns…` |
| tasks | `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/{id}`, `/move`, `/move-board`, `/comments`, `/checklist`, `/subtasks`, `/dependencies`, `/watch`, `/timer/*`, `/time` |
| chat | `/api/chat/conversations…`, `/messages…`, `/groups`, `/background`, `/mute` |
| files | `GET /api/files`, `POST /api/files/upload`, `GET …/download`, rename/move/delete |
| notifications | `GET /api/notifications`, `/read`, `/read-all` |
| calendar | `GET/POST /api/calendar/events`, `PATCH/DELETE …` |
| reports | `GET /api/reports/overview|workload|streams` |
| search | `GET /api/search?q=` |
| admin | `GET /api/admin/audit` |

Realtime: `/hubs/workspace` (presence, typing, project groups), `/hubs/chat`.

## Security model

- Short-lived JWT access tokens + rotating refresh tokens (hashed at rest).
- PBKDF2 password hashing (ASP.NET Identity default).
- `[RequirePermission("…")]` on every protected endpoint + project/conversation
  membership checks (members only see their own projects).
- Rate limiting on login + API; narrow CORS; no secrets in source.
- File uploads: policy per input (extension + size + count), blocked-extension
  list, magic-number content sniffing, filename sanitization, random storage
  names, traversal-safe reads, forced-download responses.
- Consistent error shape: `{ code, message, errors? }` with proper HTTP codes.

## Migrations

```bash
dotnet ef migrations add <Name> --startup-project src/Hamyaran.Workdesk.Api
dotnet ef database update --startup-project src/Hamyaran.Workdesk.Api
```
