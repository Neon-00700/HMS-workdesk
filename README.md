# همیاران ورک‌اسپیس — Hamyaran Workdesk

Internal project-management and collaboration workspace for a single company.
Persian-first RTL UI · light/dark themes · project-centric workspaces.

## Run the demo (2 minutes)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 and log in with the default administrator:

| field    | value      |
|----------|------------|
| username | `admin`    |
| password | `admin123` |

The workspace starts **empty** — no sample data. Create users (Admin → Users),
then projects, boards and tasks through the UI. Everything persists in the
browser (`localStorage`), so a refresh keeps your work.

> Reset anytime: **Settings → Workspace → Reset workspace** (keeps only `admin`).

## Deploy

The frontend is a standard Next.js app — deploy straight from GitHub:

- **Vercel**: import the repo, set root directory to `frontend`, deploy.
- **Any Node host**: `cd frontend && npm ci && npm run build && npm start`
- **CI**: every push runs typecheck + production build (`.github/workflows/ci.yml`).

## Monorepo layout

```
hamyaran-workdesk/
├── frontend/         # Next.js 14 + TypeScript + Tailwind + shadcn-style UI
├── backend.parked/   # (parked) ASP.NET Core 8 API source — see note below
├── deploy/           # nginx reverse-proxy example (for the full stack)
├── .github/          # CI: typecheck + build
├── docker-compose.yml
└── .env.example
```

> **Note:** the backend is parked for now — the frontend runs standalone on a
> local adapter (browser `localStorage` persistence) that implements the exact
> API contract. To re-activate the full stack later: `git mv backend.parked backend`.

## What is implemented

- **App shell**: deep-green RTL sidebar, header with global search (`Ctrl+K`
  command palette), notifications, messages shortcut, global create, theme switch
- **Dashboard**: greeting hero, KPI cards, today's tasks (one-click complete),
  upcoming deadlines, my projects, activity feed, workload, status donut, progress
- **Projects**: workspaces with overview, boards, task list, calendar, Gantt
  timeline, files, project chat, members, activity, reports, settings
- **Kanban**: drag-and-drop tasks + columns, WIP limits, quick-add, filters,
  saved filters, column management
- **Tasks**: rich detail (description editor, subtasks, checklist, comments,
  attachments, dependencies, watchers, time tracking with live timer,
  labels, assignees, reviewers, move/duplicate/archive)
- **Chat**: project channels, DMs, groups, reactions, replies, edit/delete,
  pins, mute, per-conversation backgrounds, message search
- **Calendar**: month/week/day/agenda with task deadlines, milestones, meetings
- **Files**: folders, validated uploads (extension + magic-number checks),
  progress, cancel, rename, move, delete
- **Reports**: real burndown (from actual completion dates), workload, stream
  progress, effort donut
- **Admin**: users (create/disable/force password change), roles + granular
  permissions matrix, projects, audit log (CSV export), system settings
- **Auth**: hashed local passwords, admin-created users only (no public signup),
  forced password change for new users, sessions view
- **Design system**: single token set (`globals.css`), Vazirmatn font, deep-green
  brand, semantic status colors, full dark mode, responsive + RTL

## Frontend ↔ backend wiring

`frontend/src/services/api.ts` is the single typed API client. Today it runs on
the local adapter (`mock-db.ts`) with identical DTOs. To point at the real API,
set `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SIGNALR_URL` and swap the transport —
all query hooks (`services/queries.ts`) stay unchanged.

## Security notes

- Demo passwords use a salted demo-grade hash in `localStorage` (NOT production
  cryptography) — the real backend uses PBKDF2 via ASP.NET Identity.
- No secrets in source; everything via environment (`.env`, never committed).
- Permissions mirror the backend contract; the real API enforces them server-side.

## License

Proprietary — internal company use only.
