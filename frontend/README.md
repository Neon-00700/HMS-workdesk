# Hamyaran Workdesk — Frontend

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Radix UI + TanStack Query
+ Zustand + React Hook Form + Zod + dnd-kit + Recharts + Sonner.

## Scripts

```bash
npm install
npm run dev        # http://localhost:3000 (binds 0.0.0.0)
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
```

## Architecture

```
src/
├── app/            # routes: (auth)/login, (workspace)/*, admin/*
├── components/
│   ├── ui/         # primitives: button, dialog, dropdown, tabs, ...
│   ├── shared/     # TaskCard, ProjectCard, FileUploader, UserPicker, ...
│   └── layout/     # AppShell, Sidebar, Header, CommandPalette
├── features/       # boards (kanban), tasks, chat, calendar, timeline, files, reports
├── services/       # api.ts (typed client), queries.ts (hooks), mock-db.ts (local adapter)
├── stores/         # zustand: auth, workspace, ui
├── hooks/          # use-permission, use-realtime
├── lib/            # utils, format (fa-IR), file-validation, password (demo hash)
├── config/         # permissions catalog, constants, upload policies
├── types/          # domain models (mirror backend DTOs)
└── styles/         # globals.css — design tokens
```

Rules:

- UI never calls fetch directly — only via `services/queries.ts` hooks.
- Zustand holds UI state only (sidebar, sheets, active project, session).
- All forms use React Hook Form + Zod with inline errors.
- Design tokens only: no arbitrary colors/sizes outside the system.

## Local demo adapter

`services/mock-db.ts` + `services/seed.ts` implement the full API contract
locally with **zero sample content**: the workspace starts empty with a single
admin account (`admin` / `admin123`, hashed with a demo-grade salted hash).
Mutations persist to `localStorage` (`hamyaran_db_v2`); reset from
Settings → Workspace. Project stats, role counts, workload and the burndown
chart are all computed live from real data.

## Environment

| var | purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | real backend base URL (empty = local adapter) |
| `NEXT_PUBLIC_SIGNALR_URL` | SignalR hub base URL |

## Accounts

- `admin` / `admin123` — default administrator (change the password after first login)
- New users are created by admins (Admin → Users) with a temporary password and
  forced password change on first login.
