# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

All development runs in Docker. **Do not use `npm run dev` directly.**

```bash
./scripts/dev.sh              # Start dev environment (app at localhost:3000)
./scripts/dev.sh --test       # Run tests before starting
./scripts/dev.sh --skip-build # Skip Docker image rebuild
./scripts/dev.sh --clean      # Force clean build
```

**Tests run locally** (no Docker needed):
```bash
pnpm test                                        # Run all tests once
pnpm test:watch                                  # Watch mode
pnpm test src/__tests__/format.test.ts           # Single file
pnpm test src/__tests__/format.test.ts -t "name" # Single test by name
```

**In-container commands:**
```bash
docker-compose exec app pnpm lint          # ESLint
docker-compose exec app pnpm build         # Production build check
docker-compose exec app pnpm db:push       # Push schema changes to DB
docker-compose exec app pnpm db:seed       # Seed database
docker-compose exec app pnpm db:studio     # Drizzle Studio GUI
```

## Database migrations

Migration files in `drizzle/` are committed to git and **must never be regenerated at Docker build time**. The Dockerfile does not run `pnpm db:generate`.

**Workflow when changing the schema:**
1. Edit files in `src/db/schema/`
2. Run `pnpm db:generate` — answer the interactive prompts carefully (create vs rename)
3. Commit the generated `drizzle/*.sql` file alongside the schema change
4. Push — GitHub Action builds, ArgoCD deploys, migrations run automatically

`pnpm db:generate` is intentionally NOT run by `dev.sh` — it requires human judgment on interactive prompts and must not be automated.

**Critical rules:**
- Never add `pnpm db:generate` back to the Dockerfile — it caused non-interactive prompt failures and generated non-idempotent SQL in CI
- `drizzle/` must not be in `.dockerignore` — the committed files must be copied into the image
- All `CREATE TYPE` statements in migration SQL must use a DO block to be idempotent:
  ```sql
  DO $$ BEGIN
    CREATE TYPE "public"."my_type" AS ENUM(...);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  ```
  See `drizzle/0006_auth_better_auth.sql` for the reference pattern.

## Architecture

**Mobile-first PWA** targeting a native iOS feel. Next.js 16 App Router with React Server Components, PostgreSQL + Drizzle ORM, Zod validation, Tailwind CSS 4 + shadcn/ui.

### Data flow rules

- **Server Components** do all data fetching — never fetch in Client Components unless required for interactivity
- **Server Actions** (`src/lib/actions/`) handle all mutations — no REST CRUD routes
- Every Server Action must validate input with a **Zod schema** before touching the database
- Types are **inferred from Drizzle schema** — never define them manually:
  ```ts
  type ProgramSet = typeof programSets.$inferSelect;
  ```
- ActionResult<T> is the standard return type for Server Actions

### Directory layout

```
src/
├── app/              # Next.js routes and layouts only
├── components/
│   ├── features/     # Feature-specific Client Components (interactivity)
│   └── ui/           # shadcn/ui base components
├── contexts/         # React Contexts (e.g. WorkoutSessionContext)
├── db/
│   ├── index.ts      # Drizzle client (PostgreSQL pool)
│   └── schema/       # Schema definitions — single source of truth for types
├── lib/
│   ├── actions/      # Server Actions (one file per domain)
│   ├── utils/        # Pure utility functions (format, set-mapping)
│   └── validators/   # Zod schemas (colocated with actions)
├── __tests__/        # Vitest unit tests
└── types/            # Shared TypeScript types
```

### Key patterns

- `WorkoutSessionContext` holds active session state for Client Components
- `src/lib/utils/set-mapping.ts` (`toFlatItems`, `computeMapping`) handles drag-reorder logic for sets
- `src/lib/utils/format.ts` (`buildSetSummary`, `setToken`, `restToken`, `formatTime`) — shared formatters used across components
- Drag & drop via `@dnd-kit`
- `revalidatePath()` is called after mutations to refresh Server Component data

### UI rules

- Minimum **44×44px** touch targets
- Use `:active` for tap feedback, not `:hover`
- Primary actions go in pinned bottom bars; destructive actions at the bottom of the screen
- Fixed headers and bottom navigation for iOS native feel

### Code quality

- **Reuse before adding** — check `src/lib/utils/` and `src/components/` before writing new utilities or components
- **No dead code** — if a button has no `onClick`, implement or remove it
- **No premature abstractions** — only extract a helper when it's used in 2+ places
