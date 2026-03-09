#!/usr/bin/env bash
#
# AI Agent Bootstrap Script
# Automatically detects environment and sets up the workout PWA
#

set -e

echo "=== Workout PWA - AI Agent Bootstrap ==="
echo

# Colors for  output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

HAS_DOCKER=false
HAS_PNPM=false
HAS_NODE=false

if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker and Docker Compose found"
    HAS_DOCKER=true
else
    echo -e "${YELLOW}✗${NC} Docker not found"
fi

if command -v pnpm &> /dev/null; then
    echo -e "${GREEN}✓${NC} pnpm found ($(pnpm --version))"
    HAS_PNPM=true
else
    echo -e "${YELLOW}✗${NC} pnpm not found"
fi

if command -v node &> /dev/null; then
    echo -e "${GREEN}✓${NC} Node.js found ($(node --version))"
    HAS_NODE=true
else
    echo -e "${YELLOW}✗${NC} Node.js not found"
fi

echo

# Enforce Docker requirement
if [ "$HAS_DOCKER" = true ]; then
    echo "Strategy: Docker Compose (REQUIRED)"
    echo "Running ./scripts/docker-dev.sh..."
    echo
    
    chmod +x ./scripts/docker-dev.sh
    ./scripts/docker-dev.sh
    
else
    echo -e "${RED}ERROR:${NC} Docker is REQUIRED for this project"
    echo
    echo "This project enforces container-only development."
    echo "Local development is not supported."
    echo
    echo "Please install:"
    echo "  • Docker Desktop (Mac/Windows): https://www.docker.com/products/docker-desktop"
    echo "  • Docker Engine (Linux): https://docs.docker.com/engine/install/"
    echo
    exit 1
fi

echo
echo "=== Bootstrap Complete ==="
echo

# Validate health endpoints
echo "Waiting for app to be ready..."
sleep 5

MAX_ATTEMPTS=12
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Health endpoint responding"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    echo "Waiting... ($ATTEMPT/$MAX_ATTEMPTS)"
    sleep 5
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${YELLOW}⚠${NC}  Health check timeout - app may still be starting"
    echo "Check logs with: docker-compose logs -f app"
else
    # Test readiness endpoint
    if curl -f -s http://localhost:3000/api/ready > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Readiness endpoint responding"
        echo -e "${GREEN}✓${NC} Database connected"
    fi
fi

echo
echo "=== Next Steps ==="
echo
echo "1. Open your browser:"
echo "   http://localhost:3000/workout"
echo
echo "2. Check health:"
echo "   curl http://localhost:3000/api/health"
echo "   curl http://localhost:3000/api/ready"
echo
echo "3. View logs:"
echo "   docker-compose logs -f app"
echo
echo "4. Common commands:"
echo "   ./scripts/docker-rebuild.sh              # Quick rebuild"
echo "   ./scripts/docker-clean.sh                # Clean reset"
echo "   docker-compose exec app pnpm db:diagnose # Check database"
echo
echo "All commands run in containers - no local Node.js needed!"
