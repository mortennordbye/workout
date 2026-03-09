#!/bin/bash

# Quick rebuild script - stops, rebuilds, and restarts
# Use this during development for fast iteration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔄 Quick rebuild and restart..."
echo ""

# Stop containers
echo "1/3 Stopping containers..."
docker-compose down

# Rebuild
echo "2/3 Building image..."
docker build -t workout-pwa:latest . --quiet

# Start
echo "3/3 Starting containers..."
docker-compose up -d

# Wait for health check
echo ""
echo "⏳ Waiting for app..."
sleep 5

# Test
if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "✅ App is ready at http://localhost:3000"
  echo "💪 Workout page: http://localhost:3000/workout"
else
  echo "⚠️  App might need more time..."
  echo "📋 Run: docker-compose logs -f app"
fi
