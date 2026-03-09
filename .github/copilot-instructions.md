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
- Use `./scripts/dev.sh` to start the dev environment.
- Hot-reloading via Turbopack is active through Docker volumes — no rebuilds needed for code changes.
- To rebuild the container (e.g. after adding a new npm package): re-run `./scripts/dev.sh`.
- New npm packages added to `package.json` require a container rebuild to take effect.

---

## Avoid

- No `window`/`document` without SSR guards.
- No heavy state libraries (Redux, Zustand, Jotai).
- No heavy UI libraries (Material UI, Chakra).
- No client-side data fetching when RSC can do it.
- No hand-written TypeScript types that duplicate Drizzle schema types.
- No local machine setup instructions that bypass Docker.
