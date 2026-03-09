# Development Scripts

Utility scripts for building, testing, and managing the Smart Workout PWA Docker environment.

## Scripts Overview

### 🚀 docker-dev.sh

**Main development script** - Full-featured Docker workflow with health checks and logs.

```bash
# Full rebuild and restart
./scripts/docker-dev.sh

# Skip building (just restart with existing image)
./scripts/docker-dev.sh --skip-build

# Clean build (no cache)
./scripts/docker-dev.sh --clean

# Just show logs
./scripts/docker-dev.sh --logs

# Show help
./scripts/docker-dev.sh --help
```

**Features:**

- 🔨 Builds Docker image
- 🛑 Stops existing containers
- 🚀 Starts containers with health checks
- 🏥 Tests /api/health and /api/ready endpoints
- 📋 Shows logs and useful commands
- ⚡ Smart caching for fast rebuilds

**Use Cases:**

- Primary development workflow
- Testing after code changes
- Verifying health checks work
- Initial setup and testing

---

### ⚡ docker-rebuild.sh

**Quick rebuild script** - Minimal output for fast iteration.

```bash
./scripts/docker-rebuild.sh
```

**Features:**

- Stops → Builds → Starts
- Quiet output (less noise)
- Quick health check
- Perfect for rapid testing

**Use Cases:**

- Quick code iterations
- Testing small changes
- When you don't need verbose output

---

### 🧹 docker-clean.sh

**Clean environment script** - Nuclear option to start fresh.

```bash
./scripts/docker-clean.sh
```

**Features:**

- Removes all containers
- Deletes volumes (⚠️ **destroys database**)
- Removes workout-pwa image
- Optionally cleans build cache

**Use Cases:**

- Corrupted Docker state
- Database issues requiring fresh start
- Freeing up disk space
- Testing clean installation

---

## Quick Reference

### First Time Setup

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Start development environment
./scripts/docker-dev.sh
```

### Development Workflow

**Primary Workflow (Recommended):**

```bash
# 1. Make code changes
vim src/components/...

# 2. Rebuild and test
./scripts/docker-dev.sh

# 3. View logs if needed
docker-compose logs -f app
```

**Fast Iteration Workflow:**

```bash
# 1. Make small code change
vim src/lib/actions/...

# 2. Quick rebuild
./scripts/docker-rebuild.sh

# 3. Test immediately
curl http://localhost:3000/api/health
```

**Troubleshooting Workflow:**

```bash
# 1. Clean everything
./scripts/docker-clean.sh

# 2. Clean build
./scripts/docker-dev.sh --clean

# 3. Check logs
docker-compose logs -f
```

---

## Common Commands

### During Development

```bash
# Restart without rebuilding
./scripts/docker-dev.sh --skip-build

# View application logs
docker-compose logs -f app

# View database logs
docker-compose logs -f postgres

# Execute command in container
docker-compose exec app pnpm db:migrate

# Shell into app container
docker-compose exec app sh

# Shell into database
docker-compose exec postgres psql -U postgres workout_db
```

### Health Checks

```bash
# Test liveness probe
curl http://localhost:3000/api/health

# Test readiness probe
curl http://localhost:3000/api/ready

# Watch health status
watch -n 1 'curl -s http://localhost:3000/api/health'
```

### Debugging

```bash
# Check container status
docker-compose ps

# Inspect container
docker inspect workout-app

# View resource usage
docker stats

# Check networks
docker network ls
docker network inspect workout_workout-network
```

---

## Script Comparison

| Feature               | docker-dev.sh   | docker-rebuild.sh | docker-clean.sh |
| --------------------- | --------------- | ----------------- | --------------- |
| **Speed**             | ⚡⚡ Medium     | ⚡⚡⚡ Fast       | ⚡ Slow         |
| **Output**            | 📋 Detailed     | 📄 Minimal        | 📋 Interactive  |
| **Health Checks**     | ✅ Yes          | ✅ Basic          | ❌ No           |
| **Logs Display**      | ✅ Optional     | ❌ No             | ❌ No           |
| **Cache Control**     | ✅ --clean flag | ❌ Uses cache     | ✅ Removes all  |
| **Data Preservation** | ✅ Keeps data   | ✅ Keeps data     | ❌ Deletes data |

---

## Environment Variables

Scripts respect the following environment variables:

```bash
# Skip interactive prompts
export DOCKER_DEV_AUTO_LOGS=true

# Change default timeout
export DOCKER_DEV_TIMEOUT=60

# Custom Docker Compose file
export COMPOSE_FILE=docker-compose.prod.yml
```

---

## Troubleshooting

### Permission Denied

```bash
chmod +x scripts/*.sh
```

### Port 3000 Already in Use

```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>

# Or stop docker-compose
docker-compose down
```

### Build Fails

```bash
# Clean build
./scripts/docker-dev.sh --clean

# Or complete cleanup
./scripts/docker-clean.sh
```

### Database Connection Issues

```bash
# Check database is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart just database
docker-compose restart postgres
```

### Out of Disk Space

```bash
# Clean everything
./scripts/docker-clean.sh

# Remove unused images
docker image prune -a

# Remove build cache
docker builder prune -a
```

---

## Tips & Tricks

### Fast Development

```bash
# Terminal 1: Keep logs running
docker-compose logs -f app

# Terminal 2: Quick rebuilds
./scripts/docker-rebuild.sh
```

### Database Management

```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres workout_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres workout_db < backup.sql

# Reset database (keeps structure)
docker-compose exec postgres psql -U postgres workout_db -c "TRUNCATE users, exercises, workout_sessions, workout_sets CASCADE;"
```

### Performance Testing

```bash
# Build once
./scripts/docker-dev.sh

# Load test
ab -n 1000 -c 10 http://localhost:3000/api/health

# Monitor resources
docker stats workout-app
```

---

## Adding New Scripts

To add a new script:

1. Create script file: `scripts/your-script.sh`
2. Add shebang: `#!/bin/bash`
3. Make executable: `chmod +x scripts/your-script.sh`
4. Document in this README

**Template:**

```bash
#!/bin/bash
set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Your script logic here
echo "Running your script..."
```

---

## Integration with IDEs

### VS Code

Add to `.vscode/tasks.json`:

```json
{
  "label": "Docker: Rebuild and Test",
  "type": "shell",
  "command": "./scripts/docker-dev.sh",
  "problemMatcher": []
}
```

### Keyboard Shortcut

macOS/Linux: Add to shell profile

```bash
alias dr='./scripts/docker-rebuild.sh'
alias dd='./scripts/docker-dev.sh'
alias dc='./scripts/docker-clean.sh'
```

---

**Last Updated:** March 6, 2026
