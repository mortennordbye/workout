# Kubernetes Deployment

Deploys [workout](https://github.com/mortennordbye/workout) — a Next.js PWA — plus a PostgreSQL database into a `workout` namespace.

## Prerequisites

- [external-secrets-operator](https://external-secrets.io) installed with a `ClusterSecretStore` named `bitwarden-secretsmanager`
- Gateway API with a `Gateway` named `traefik-gateway-private` in the `traefik` namespace

## Deploying a new image

Images are built and pushed automatically by GitHub Actions on every push to `main` and on version tags. No manual build step needed.

### 1. Push to main (or tag a release)

```bash
git push origin main
# or for a versioned release:
git tag v1.0.0 && git push origin v1.0.0
```

The workflow builds and pushes to `ghcr.io/mortennordbye/workout` with tags:
- `latest` — on every push to `main`
- `sha-<short-sha>` — on every push
- `v1.0.0` — on git tags

### 2. Update the image tag in `k8s/app.yaml`

```yaml
image: ghcr.io/mortennordbye/workout:latest
# or pin to a specific sha/tag for stability:
image: ghcr.io/mortennordbye/workout:sha-abc1234
```

### 3. Apply

```bash
kubectl apply -f k8s/app.yaml
```

## Teardown

```bash
kubectl delete namespace workout
```

> **Note:** Deleting the namespace removes the PVC and all data. Back up first if needed.
