# Smart Workout PWA

**A mobile-first Workout Tracking PWA built with Next.js 16 (App Router).**
The app is designed to feel like a native iOS app and runs entirely in Docker containers to ensure environment consistency.

---

## 🚀 Quick Start (Container-Only)

**This project REQUIRES Docker. Local `pnpm dev` or `npm run dev` is NOT supported.**

### Prerequisites
- Docker Desktop (Mac/Windows) or Docker Engine (Linux)
- Docker Compose
- **No Node.js or PostgreSQL required on your host machine.**

### Setup & Run
1.  **Bootstrap the Environment:**
    ```bash
    pnpm run setup
    # OR
    bash scripts/ai-bootstrap.sh
    ```

2.  **Start Development:**
    ```bash
    ./scripts/docker-dev.sh
    ```
    *   App: [http://localhost:3000](http://localhost:3000)
    *   Health Check: [http://localhost:3000/api/health](http://localhost:3000/api/health)
    *   Ready Check: [http://localhost:3000/api/ready](http://localhost:3000/api/ready)

### Common Commands (Run inside container)
All commands must be run inside the Docker container or via `docker-compose exec`.

```bash
# Database Operations
docker-compose exec app pnpm db:push       # Push schema changes (Dev)
docker-compose exec app pnpm db:migrate    # Run migrations (Prod)
docker-compose exec app pnpm db:seed       # Seed database
docker-compose exec app pnpm db:studio     # Open Drizzle Studio
docker-compose exec app pnpm db:diagnose   # Check DB connection

# Quality Assurance
docker-compose exec app pnpm lint          # Run ESLint
docker-compose exec app pnpm build         # Run Production Build
```

---

## 🛠 Tech Stack

| Concern        | Tool                                                    |
| -------------- | ------------------------------------------------------- |
| **Framework**  | Next.js 16 — App Router, React Server Components        |
| **Language**   | TypeScript (Strict Mode)                                |
| **Database**   | PostgreSQL 16 (Dockerized)                              |
| **ORM**        | Drizzle ORM — `drizzle-kit push` for dev                |
| **Validation** | Zod — Mandatory on Server Actions & API routes          |
| **Styling**    | Tailwind CSS 4.2                                        |
| **UI**         | shadcn/ui + Lucide React icons                          |
| **PWA**        | Serwist (Service Workers, Offline-first)                |
| **Infra**      | Docker Compose (Dev) → Kubernetes (Prod)                |

---

## 📐 Architecture & Development Guidelines

### 1. Data Fetching & State
- **React Server Components (RSC):** Always use RSC for data fetching. Never fetch in Client Components unless absolutely necessary for interactivity.
- **Server Actions:** Use Server Actions for all mutations (Create, Update, Delete). Do not use REST API routes for mutations.
- **Validation:** Validate every Server Action input with Zod **before** touching the database.
- **State Management:** Prefer URL state (search params) or Server Actions over client state. Avoid Redux/Zustand; use `useState` only for local UI interaction.

### 2. UI & Mobile-First Rules
- **Native Feel:** Every screen must feel like a native iOS app (fixed headers, bottom navigation).
- **Touch Targets:** Interactive elements must be at least **44x44px**.
- **Interaction:** Use `:active` states for tap feedback instead of `:hover`.
- **Navigation:**
    - Primary actions (e.g., "Start Workout") go in pinned bottom bars.
    - Destructive actions go at the bottom of the screen.
    - "Edit" modes should be inline overlays, not separate pages.

### 3. Directory Structure
```
src/
├── app/                  # Next.js App Router (Pages & Layouts only)
│   ├── (workout)/        # Route groups for organization
│   ├── api/              # API Routes (Health checks, etc.)
│   └── layout.tsx        # Root layout
├── components/
│   ├── features/         # Feature-specific Client Components (<Name>Client.tsx)
│   └── ui/               # shadcn/ui base components
├── db/
│   ├── index.ts          # Drizzle client instance
│   └── schema/           # Drizzle schema definitions (Single Source of Truth)
├── lib/
│   ├── actions/          # Server Actions (one file per domain)
│   └── validators/       # Zod schemas (colocated with actions)
└── types/                # Shared TypeScript types (inferred from Drizzle)
```

---

## 🗄 Database Schema

Key tables defined in `src/db/schema/`:

| Table | Purpose |
|-------|---------|
| `exercises` | Exercise library (System + User custom). |
| `programs` | Workout templates (e.g., "Push A"). |
| `program_exercises` | Exercises within a program. |
| `workout_sessions` | Actual workout logs (Date, Duration). |
| `workout_sets` | Sets performed (Reps, Weight, RPE). |

*   **Single Source of Truth:** Drizzle schema definitions are the source of truth. Types must be inferred (`typeof table.$inferSelect`).
*   **Ids:** Use Serial IDs for simplicity in this PWA context unless UUIDs are strictly required by new constraints.

---

## 📦 Deployment

### Development (Docker Compose)
Runs the app and PostgreSQL database.
```bash
./scripts/docker-dev.sh
```

### Production (Docker)
1.  **Build Image:** `docker build -t workout-pwa:latest .`
2.  **Run:** `docker run -p 3000:3000 -e DATABASE_URL=... workout-pwa:latest`


**Environment Variables:**
- `DATABASE_URL` (Required): `postgresql://user:pass@host:5432/db`
- `NODE_ENV`: `development` or `production`
- `NEXT_TELEMETRY_DISABLED`: `1` (Recommended)

---

## 🔧 Scripts & Workflow

| Script | Command | Purpose |
| :--- | :--- | :--- |
| **Dev** | `./scripts/docker-dev.sh` | Full rebuild & start with logs/health checks. |
| **Rebuild** | `./scripts/docker-rebuild.sh` | Quick restart after code changes (skips full rebuild if possible). |
| **Clean** | `./scripts/docker-clean.sh` | **Nuclear option.** Removes containers, volumes, and DB data. |
| **Bootstrap** | `./scripts/ai-bootstrap.sh` | First-time setup helper. |

---

## 🧩 Troubleshooting

### Common Issues
*   **Port 3000 in use:** Stop other containers or processes (`lsof -i :3000`).
*   **Database Connection Failed:** Ensure the `postgres` service is healthy (`docker-compose ps`). Check logs: `docker-compose logs postgres`.
*   **Type Errors:** Run `docker-compose exec app pnpm db:generate` to refresh Drizzle types if schema changed.

### Health Checks
- **Liveness:** `curl http://localhost:3000/api/health`
- **Readiness:** `curl http://localhost:3000/api/ready` (Checks DB connection)

---

## 🎨 Assets & Icons
PWA icons reside in `/public`. Required for PWA installation:
- `icon-192x192.png`
- `icon-512x512.png`
- `apple-touch-icon.png`
- `favicon.ico`

---

## 📄 License
MIT License. See [LICENSE](LICENSE) for details.
