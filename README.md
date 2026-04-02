# Smart Workout PWA

**A mobile-first Workout Tracking PWA built with Next.js 16 (App Router).**
Designed to feel like a native iOS app. Runs in Docker containers for environment consistency.

---

## 🚀 Quick Start

### Prerequisites
- Docker Desktop

### Start Development
```bash
./scripts/dev.sh
```
- App: [http://localhost:3000](http://localhost:3000)
- Health: [http://localhost:3000/api/health](http://localhost:3000/api/health)

### Common Commands

```bash
# Database
docker-compose exec app pnpm db:push       # Push schema changes
docker-compose exec app pnpm db:seed       # Seed exercise library + demo user
docker-compose exec app pnpm db:seed-fake  # Populate demo user with realistic test data
docker-compose exec app pnpm db:reset-user # Wipe all user data (keeps exercises + user record)
docker-compose exec app pnpm db:studio     # Open Drizzle Studio
docker-compose exec app pnpm db:migrate    # Run migrations (prod)

# Quality
docker-compose exec app pnpm lint          # ESLint
docker-compose exec app pnpm build         # Production build check

# Tests (run locally — no Docker needed)
pnpm test                                  # Run all tests once
pnpm test:watch                            # Watch mode
```

### Test data

`db:seed-fake` populates the demo user (id=1) with:
- 2 programs ("Push Pull Legs A" and "Upper Body") with planned exercises and sets
- An active 12-week training cycle with Mon/Wed/Fri slots
- ~12 completed workout sessions spread over the past 4 weeks

```bash
# Populate
docker-compose exec app pnpm db:seed-fake

# Overwrite existing data
docker-compose exec app pnpm db:seed-fake --force

# Wipe everything and start fresh
docker-compose exec app pnpm db:reset-user
```

### Dev Script Options

```bash
./scripts/dev.sh              # Start dev environment
./scripts/dev.sh --test       # Run tests before starting
./scripts/dev.sh --prod       # Build and run production image
./scripts/dev.sh --skip-build # Skip Docker image rebuild
./scripts/dev.sh --clean      # Force clean build (no cache)
./scripts/dev.sh --logs       # Attach to logs only
```

---

## 🛠 Tech Stack

| Concern | Tool |
| --- | --- |
| **Framework** | Next.js 16 — App Router, React Server Components |
| **Language** | TypeScript (Strict Mode) |
| **Database** | PostgreSQL 16 (Dockerized) |
| **ORM** | Drizzle ORM |
| **Validation** | Zod — required on all Server Actions |
| **Styling** | Tailwind CSS 4 |
| **UI** | shadcn/ui + Lucide React |
| **PWA** | Serwist (Service Workers) |
| **Testing** | Vitest |

---

## 📐 Development Guidelines

### Data & State
- **Server Components** for all data fetching — never fetch in Client Components unless required for interactivity
- **Server Actions** for all mutations — no REST routes for CRUD
- **Zod validation** on every Server Action before touching the database
- **Local state** (`useState`) only for UI interaction — no Redux/Zustand

### UI & Mobile-First
- Every screen must feel like a native iOS app (fixed headers, bottom nav)
- Touch targets minimum **44×44px**
- Use `:active` for tap feedback, not `:hover`
- Primary actions go in pinned bottom bars
- Destructive actions at the bottom of the screen

### Code Quality
- **Reuse before adding** — always check for existing components, hooks, and utilities before writing new ones. The feature-component split and `src/lib/utils/` exist for this reason. Adding a duplicate `formatTime` or a second picker modal is worse than importing the shared one.
- **No dead code** — if a button has no `onClick`, remove it or implement it. Don't leave placeholder UI.
- **No premature abstractions** — don't extract a helper for something used once. Wait until it's needed in two or more places.

### Directory Structure
```
src/
├── app/                  # Next.js pages and layouts only
├── components/
│   ├── features/         # Feature-specific Client Components
│   └── ui/               # shadcn/ui base components
├── contexts/             # React Contexts (e.g. WorkoutSessionContext)
├── db/
│   ├── index.ts          # Drizzle client
│   └── schema/           # Schema definitions — single source of truth for types
├── lib/
│   ├── actions/          # Server Actions (one file per domain)
│   ├── utils/            # Pure utility functions (format, set-mapping, etc.)
│   └── validators/       # Zod schemas (colocated with actions)
├── __tests__/            # Vitest unit tests
└── types/                # Shared TypeScript types (inferred from Drizzle)
```

---

## 🗄 Database Schema

| Table | Purpose |
|---|---|
| `exercises` | Exercise library (system + custom) |
| `programs` | Workout templates |
| `program_exercises` | Exercises within a program |
| `workout_sessions` | Workout logs (date, duration) |
| `workout_sets` | Sets performed (reps, weight, RPE) |

Types are inferred from Drizzle schema — never define them manually:
```ts
type ProgramSet = typeof programSets.$inferSelect;
```

---

## 📦 Deployment

### Production
```bash
docker build -t workout-pwa:latest .
docker run -p 3000:3000 -e DATABASE_URL=... workout-pwa:latest
```

**Environment variables:**
- `DATABASE_URL` — `postgresql://user:pass@host:5432/db`
- `NODE_ENV` — `development` or `production`
- `NEXT_TELEMETRY_DISABLED` — `1`

---

## 🧩 Troubleshooting

- **Port 3000 in use:** `lsof -i :3000`
- **DB connection failed:** `docker-compose ps` / `docker-compose logs postgres`
- **Type errors after schema change:** `docker-compose exec app pnpm db:generate`
