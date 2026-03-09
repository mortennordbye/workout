#!/bin/bash

# Docker Development Script
# Fast build, test, and restart workflow for local development

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to project root
cd "$PROJECT_ROOT"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Smart Workout PWA - Docker Dev      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Parse command line arguments
SKIP_BUILD=false
LOGS_ONLY=false
CLEAN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --logs)
      LOGS_ONLY=true
      shift
      ;;
    --clean)
      CLEAN=true
      shift
      ;;
    --help)
      echo "Usage: ./scripts/docker-dev.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --skip-build    Skip Docker image build"
      echo "  --logs          Only show logs (don't rebuild)"
      echo "  --clean         Clean build (no cache)"
      echo "  --help          Show this help message"
      echo ""
      echo "Examples:"
      echo "  ./scripts/docker-dev.sh              # Full rebuild and restart"
      echo "  ./scripts/docker-dev.sh --skip-build # Restart without rebuilding"
      echo "  ./scripts/docker-dev.sh --logs       # Just show logs"
      echo "  ./scripts/docker-dev.sh --clean      # Clean build from scratch"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# If only showing logs
if [ "$LOGS_ONLY" = true ]; then
  echo -e "${GREEN}📋 Showing logs...${NC}"
  docker-compose logs -f
  exit 0
fi

# Stop running containers
echo -e "${YELLOW}🛑 Stopping containers...${NC}"
docker-compose down 2>/dev/null || true
echo ""

# Build Docker image
if [ "$SKIP_BUILD" = false ]; then
  echo -e "${BLUE}🔨 Building Docker image...${NC}"
  
  if [ "$CLEAN" = true ]; then
    echo -e "${YELLOW}   Clean build (no cache)${NC}"
    docker build --no-cache -t workout-pwa:latest .
  else
    docker build -t workout-pwa:latest .
  fi
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
  else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
  fi
  echo ""
else
  echo -e "${YELLOW}⏭️  Skipping build${NC}"
  echo ""
fi

# Start containers
echo -e "${GREEN}🚀 Starting containers...${NC}"
docker-compose up -d

# Wait for containers to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 3

# Check if containers are running
if docker-compose ps | grep -q "Up"; then
  echo -e "${GREEN}✅ Containers started${NC}"
else
  echo -e "${RED}❌ Containers failed to start${NC}"
  docker-compose logs
  exit 1
fi

echo ""

# Display container status
echo -e "${BLUE}📊 Container Status:${NC}"
docker-compose ps
echo ""

# Wait for app to be ready
echo -e "${YELLOW}⏳ Waiting for application to be ready...${NC}"
RETRY_COUNT=0
MAX_RETRIES=30

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is ready!${NC}"
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Application failed to start within timeout${NC}"
    echo -e "${YELLOW}📋 Showing logs:${NC}"
    docker-compose logs app
    exit 1
  fi
  
  echo -n "."
  sleep 1
done

echo ""

# Test health endpoints
echo -e "${BLUE}🏥 Testing health endpoints:${NC}"

# Health check
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
  echo -e "  ${GREEN}✓${NC} Health: $HEALTH_RESPONSE"
else
  echo -e "  ${RED}✗${NC} Health: Failed"
fi

# Readiness check
READY_RESPONSE=$(curl -s http://localhost:3000/api/ready)
if echo "$READY_RESPONSE" | grep -q "ready"; then
  echo -e "  ${GREEN}✓${NC} Ready:  $READY_RESPONSE"
else
  echo -e "  ${RED}✗${NC} Ready:  Failed (DB might not be ready yet)"
fi

echo ""

# Display useful information
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Application Running           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}🌐 Application:${NC}  http://localhost:3000"
echo -e "${BLUE}💪 Workout App:${NC}  http://localhost:3000/workout"
echo -e "${BLUE}🏥 Health:${NC}       http://localhost:3000/api/health"
echo -e "${BLUE}✓  Ready:${NC}        http://localhost:3000/api/ready"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "  ${BLUE}View logs:${NC}       docker-compose logs -f"
echo -e "  ${BLUE}View app logs:${NC}   docker-compose logs -f app"
echo -e "  ${BLUE}Stop:${NC}            docker-compose down"
echo -e "  ${BLUE}Restart:${NC}         ./scripts/docker-dev.sh"
echo -e "  ${BLUE}Clean restart:${NC}   ./scripts/docker-dev.sh --clean"
echo -e "  ${BLUE}Shell into app:${NC}  docker-compose exec app sh"
echo -e "  ${BLUE}Run migrations:${NC}  docker-compose exec app pnpm db:migrate"
echo ""

# Ask if user wants to see logs
read -p "$(echo -e ${YELLOW}Show logs? [y/N]:${NC} )" -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${GREEN}📋 Showing logs (Ctrl+C to exit)...${NC}"
  echo ""
  docker-compose logs -f
fi
