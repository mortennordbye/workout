#!/usr/bin/env bash
# Build the production Docker image (runner stage).
#
# Usage:
#   ./scripts/build-prod.sh
#   IMAGE=myregistry/workout-app:v1 ./scripts/build-prod.sh
#   IMAGE=myregistry/workout-app:v1 PUSH=true ./scripts/build-prod.sh
#
# Environment variables:
#   IMAGE  — full image name + tag  (default: workout-app:latest)
#   PUSH   — set to "true" to push after build

set -euo pipefail

IMAGE="${IMAGE:-workout-app:latest}"
PUSH="${PUSH:-false}"

echo "🔨 Building production image: $IMAGE"
docker build --target runner -t "$IMAGE" .
echo "✅ Built $IMAGE"

if [ "$PUSH" = "true" ]; then
  echo "📤 Pushing $IMAGE..."
  docker push "$IMAGE"
  echo "✅ Pushed $IMAGE"
fi

echo ""
echo "To deploy to Kubernetes:"
echo "  1. Update the image in k8s/app.yaml"
echo "  2. Fill in base64 secret values in k8s/app.yaml"
echo "  3. kubectl apply -f k8s/namespace.yaml"
echo "     kubectl apply -f k8s/postgres.yaml"
echo "     kubectl apply -f k8s/app.yaml"
echo "  4. kubectl port-forward -n workout svc/workout-app 3000:3000"
