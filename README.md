# Smart Workout PWA

Progressive web app for workout tracking. Self-hosted, offline-capable, built for Kubernetes deployment.

## Quick Start

**IMPORTANT: This project ONLY runs in containers. Local development is not supported.**

```bash
# Automated setup (AI agents)
pnpm run setup

# Standard development workflow
./scripts/docker-dev.sh
```

Access: http://localhost:3000/workout

## Tech Stack

- **Framework**: Next.js 16 (App Router, React Server Components)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL 16
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Styling**: Tailwind CSS 4.2
- **UI**: shadcn/ui + lucide-react
- **PWA**: Serwist service worker
- **Deployment**: Docker + Kubernetes

## Architecture

```
User → Browser/PWA → Next.js App Router
                    ↓
                Server Actions (Zod validation)
                    ↓
                Drizzle ORM
                    ↓
                PostgreSQL

Health Endpoints:
- /api/health (liveness)
- /api/ready (readiness + DB check)
```

## Development

### Prerequisites

- Docker & Docker Compose (REQUIRED)
- That's it - everything else runs in containers

### Environment Variables

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/workout_db
NODE_ENV=development
```

### Commands

All commands run in containers:

```bash
# Development workflows
./scripts/docker-dev.sh          # Full rebuild with health checks
./scripts/docker-rebuild.sh      # Quick rebuild after code changes
./scripts/docker-clean.sh        # Nuclear option - removes all data

# Database operations (run inside container)
docker-compose exec app pnpm db:generate    # Generate migration
docker-compose exec app pnpm db:push        # Apply migration (dev)
docker-compose exec app pnpm db:migrate     # Apply migration (prod)
docker-compose exec app pnpm db:seed        # Seed demo data
docker-compose exec app pnpm db:diagnose    # Check DB state

# TypeScript/Linting (run inside container)
docker-compose exec app pnpm build          # Production build
docker-compose exec app pnpm lint           # Run ESLint
```

## Database Schema

### Tables

**users** - User accounts (auth placeholder)

- id (serial, PK)
- username (text, unique)
- created_at (timestamp)

**exercises** - Exercise library

- id (serial, PK)
- name (text)
- category (text)
- user_id (integer, FK → users, nullable for system exercises)

**workout_sessions** - Workout instances

- id (serial, PK)
- user_id (integer, FK → users)
- exercise_id (integer, FK → exercises)
- started_at (timestamp)
- completed_at (timestamp, nullable)

**workout_sets** - Individual sets

- id (serial, PK)
- session_id (integer, FK → workout_sessions, cascade delete)
- set_number (integer)
- weight_kg (numeric)
- reps (integer)
- rpe (integer, 1-10)
- rest_seconds (integer, nullable)
- completed_at (timestamp)

Relationships: Foreign keys with cascade deletes, relational query API via Drizzle.

## Deployment

### Docker Compose (Development)

```bash
./scripts/docker-dev.sh
# OR
docker-compose up --build
```

Includes: PostgreSQL + app with automated migrations.

### Standalone Docker (Production)

```bash
docker build -t workout-pwa:latest .
docker run -p 3000:3000 \
  -e DATABASE_URL='postgresql://...' \
  workout-pwa:latest
```

### Kubernetes (Production)

```bash
# Build and push
docker build -t your-registry.io/workout-pwa:v1.0.0 .
docker push your-registry.io/workout-pwa:v1.0.0

# Deploy
kubectl apply -f k8s/namespace.yaml
kubectl create secret generic workout-app-secret \
  --from-literal=DATABASE_URL='postgresql://...' \
  -n workout-app
kubectl apply -f k8s/
```

Requirements:

- Kubernetes cluster (k3s/k8s)
- kubectl configured
- Ingress controller
- Container registry

See [k8s/README.md](k8s/README.md) and [DEPLOYMENT.md](DEPLOYMENT.md) for details.

## Project Structure

```
src/
├── app/
│   ├── (workout)/              # Route group
│   │   └── workout/page.tsx    # Main workout page
│   ├── api/
│   │   ├── health/route.ts     # Liveness probe
│   │   └── ready/route.ts      # Readiness probe
│   ├── layout.tsx
│   ├── manifest.ts             # PWA manifest
│   └── sw.ts                   # Service worker
├── components/
│   ├── features/               # Business logic
│   │   ├── WorkoutLogger.tsx
│   │   ├── RestTimer.tsx
│   │   └── ExerciseSelector.tsx
│   └── ui/                     # shadcn/ui primitives
├── db/
│   ├── index.ts                # Drizzle client
│   └── schema/                 # Table definitions
│       ├── users.ts
│       ├── exercises.ts
│       ├── workout-sessions.ts
│       ├── workout-sets.ts
│       └── relations.ts
├── lib/
│   ├── actions/                # Server Actions
│   │   ├── exercises.ts
│   │   ├── workout-sessions.ts
│   │   └── workout-sets.ts
│   ├── utils/
│   │   └── workout-calculations.ts
│   └── validators/             # Zod schemas
│       └── workout.ts
└── types/
    └── workout.ts

scripts/
├── docker-dev.sh               # Main dev workflow
├── docker-rebuild.sh           # Quick rebuild
├── docker-clean.sh             # Clean environment
├── migrate.ts                  # Run migrations
├── seed.ts                     # Seed data
└── diagnose.ts                 # DB diagnostics

k8s/
├── namespace.yaml
├── deployment.yaml             # App deployment (2 replicas)
├── service.yaml
├── ingress.yaml
├── configmap.yaml
└── secret.yaml                 # Template only
```

## Troubleshooting

### Workout Creation Fails

```bash
# Check DB state
docker-compose exec app pnpm db:diagnose

# Check logs
docker-compose logs app --tail=100

# Verify connectivity
curl http://localhost:3000/api/ready

# Clean reset
./scripts/docker-clean.sh
./scripts/docker-dev.sh
```

### Migration Errors

```bash
# "relation already exists"
docker-compose down -v          # Remove volumes
docker-compose up -d

# OR full clean
./scripts/docker-clean.sh
./scripts/docker-dev.sh
```

### TypeScript Errors

```bash
# Check compilation (in container)
docker-compose exec app pnpm build

# Clean rebuild
./scripts/docker-clean.sh
./scripts/docker-dev.sh
```

### Database Access

```bash
# Direct access
docker-compose exec postgres psql -U postgres workout_db

# Check migrations
docker-compose exec postgres psql -U postgres workout_db \
  -c "SELECT * FROM __drizzle_migrations;"

# Run diagnostics
docker-compose exec app tsx scripts/diagnose.ts
```

## Health Checks

```bash
# Liveness
curl http://localhost:3000/api/health
# {"status":"ok","timestamp":"..."}

# Readiness (includes DB check)
curl http://localhost:3000/api/ready
# {"status":"ready","dbConnected":true}
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

See [LICENSE](LICENSE) file.
