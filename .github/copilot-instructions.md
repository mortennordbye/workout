# Copilot Instructions — Workout PWA

## Project Overview

A mobile-first Workout Tracking PWA built with Next.js 16 (App Router). The target user is on an iPhone. The app runs entirely in Docker/OrbStack — never suggest running anything directly on the host machine.

---

## Tech Stack

| Concern        | Tool                                                    |
| -------------- | ------------------------------------------------------- |
| Framework      | Next.js 16 — App Router, React Server Components        |
| Language       | TypeScript (strict mode)                                |
| Database       | PostgreSQL 16 (Docker)                                  |
| ORM            | Drizzle ORM — use `drizzle-kit push` for schema changes |
| Validation     | Zod — required on every Server Action and API route     |
| Styling        | Tailwind CSS 4.2                                        |
| UI             | shadcn/ui + Lucide React icons                          |
| PWA/Offline    | Serwist (service workers)                               |
| Infrastructure | Docker Compose (dev) → Kubernetes (prod)                |

---

## Architecture Rules

### Data fetching

- **Always use React Server Components** for data fetching — never fetch in a Client Component unless absolutely necessary.
- **Use Server Actions** for all mutations (create, update, delete). Never use REST API routes for mutations.
- Validate every Server Action input with Zod before touching the database.

### State management

- Prefer URL state or Server Actions before any client state.
- Do not reach for Redux, Zustand, or similar libraries. `useState` + Server Actions covers almost everything.

### Single Source of Truth

- Drizzle schema definitions are the source of truth. Types must be inferred from Drizzle (`typeof table.$inferSelect`) — do not hand-write duplicate types.
- Zod schemas must match Drizzle models exactly.

---

## UI & Mobile Rules

### Mobile-first is non-negotiable

- Every screen must feel like a native iOS app — fixed headers, bottom navigation, no desktop-style layouts.
- All interactive touch targets must be **at least 44×44px**.
- Do not add `hover:` styles that have no touch equivalent.
- Use `active:` states instead of `hover:` for tap feedback.

### Navigation patterns

- Use pinned bottom buttons for primary actions (e.g. "Start Workout", "Finish Workout").
- Destructive actions (delete) go at the **bottom** of a screen, never in the header.
- Edit mode should feel like an **overlay on the same view** — controls appear/disappear in-place. Never navigate to a separate "edit page" for inline data.

### No heavy UI libraries

- Use Tailwind CSS + shadcn/ui only. Do not suggest Material UI, Chakra, Ant Design, or similar.

---

## PWA / Capacitor Readiness

- Never access `window` or `document` without guarding: `typeof window !== 'undefined'`.
- Do not use browser APIs that have no Capacitor equivalent without noting the limitation.
- All features must work offline or degrade gracefully — users log workouts in gyms with poor signal.

---

## Development Environment

- This project runs **only inside Docker/OrbStack** containers. Do not suggest `pnpm dev` or any local-machine commands.
- Use `./scripts/docker-dev.sh` to start the dev environment.
- Hot-reloading via Turbopack is active through Docker volumes — no rebuilds needed for code changes.
- To rebuild the container (e.g. after adding a new npm package): re-run `./scripts/docker-dev.sh`.
- New npm packages added to `package.json` require a container rebuild to take effect.

### Commands (run inside the container or via Docker exec)

```bash
pnpm lint              # ESLint
pnpm db:push           # Push Drizzle schema changes to DB (preferred over migrations in dev)
pnpm db:seed           # Seed the database
pnpm db:studio         # Open Drizzle Studio
```

---

## Avoid

- No `window`/`document` without SSR guards.
- No heavy state libraries (Redux, Zustand, Jotai).
- No heavy UI libraries (Material UI, Chakra).
- No client-side data fetching when RSC can do it.
- No hand-written TypeScript types that duplicate Drizzle schema types.
- No local machine setup instructions that bypass Docker.

---

## Code Organisation

```
src/
├── app/                  # Next.js App Router — pages and layouts only, no business logic
├── components/
│   ├── features/         # Feature-specific Client Components (named <Feature>Client.tsx)
│   └── ui/               # shadcn/ui base components
├── db/
│   ├── index.ts          # Drizzle client
│   └── schema/           # Table definitions — the single source of truth for all types
├── lib/
│   ├── actions/          # Server Actions ("use server") — one file per domain
│   └── validators/       # Zod schemas, colocated with the actions that use them
└── types/                # Shared TypeScript types inferred from Drizzle schema
```

### Naming conventions

- **Client Components** in `features/` are suffixed `Client` (e.g. `WorkoutSetClient.tsx`).
- **Server Actions** live in `src/lib/actions/` (one file per domain: `programs.ts`, `workout-sessions.ts`, etc.).
- **Zod validators** mirror their action file (e.g. `src/lib/validators/programs.ts`).
- Files use **kebab-case**; React components use **PascalCase**.

---

## Database Schema (Drizzle)

Key tables (all defined under `src/db/schema/`):

| Table | Purpose |
|-------|---------|
| `exercises` | Exercise library (system + user-created); category: strength/cardio/flexibility |
| `programs` | Named workout templates (e.g. "Push 1") |
| `program_exercises` | Ordered exercise slots within a program |
| `program_sets` | Planned set blueprints (target reps, weight, duration) |
| `workout_sessions` | Completed workouts (date, start/end time, isCompleted flag) |
| `workout_sets` | Individual sets logged during a session (actualReps, weight, RPE 1–10) |

All tables use `cascade` deletes. Types must be inferred with `typeof table.$inferSelect` — never hand-written.
