# Container-Only Development

This project **REQUIRES** Docker for all development and deployment.

## Why Container-Only?

1. **Consistency** - Everyone uses the exact same environment
2. **Simplicity** - No Node.js/pnpm/PostgreSQL installation on host
3. **Isolation** - Dependencies stay in containers
4. **Production Parity** - Dev matches production environment

## Requirements

- Docker Desktop (Mac/Windows) or Docker Engine (Linux)
- Docker Compose
- **That's it!**

No Node.js, pnpm, PostgreSQL, or other tooling needed on your host machine.

## Quick Start

```bash
# First time setup
pnpm run setup
# OR
bash scripts/ai-bootstrap.sh

# Daily development
./scripts/docker-dev.sh
```

## Running Commands

All commands run **inside containers**:

```bash
# Database operations
docker-compose exec app pnpm db:diagnose
docker-compose exec app pnpm db:seed
docker-compose exec app pnpm db:migrate

# Build and lint
docker-compose exec app pnpm build
docker-compose exec app pnpm lint

# Access PostgreSQL
docker-compose exec postgres psql -U postgres workout_db

# View logs
docker-compose logs -f app
```

## What if I try `pnpm dev` locally?

It will fail with an error message. This is intentional! Use `./scripts/docker-dev.sh` instead.

## Development Workflow

```
./scripts/docker-dev.sh      → Full setup (first time or major changes)
./scripts/docker-rebuild.sh  → Quick rebuild (after code changes)
./scripts/docker-clean.sh    → Nuclear option (start fresh)
```

## Benefits for AI Agents

- No environment detection needed - Docker always works
- No version conflicts (Node.js, pnpm, PostgreSQL)
- Simplified bootstrap process
- Consistent commands across all machines

## For More Information

- [README.md](README.md) - Project overview and technical details
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guides (all container-based)
- [.cursorrules](.cursorrules) - AI agent development guidelines
