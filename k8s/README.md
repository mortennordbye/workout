# Kubernetes Deployment

Deploys [workout](https://github.com/mortennordbye/workout) — a Next.js PWA — plus a PostgreSQL database into a `workout` namespace.

## Prerequisites

- [external-secrets-operator](https://external-secrets.io) installed with a `ClusterSecretStore` named `bitwarden-secretsmanager`
- Gateway API with a `Gateway` named `traefik-gateway-private` in the `traefik` namespace

## Deploying a new image

Images are built and pushed automatically by GitHub Actions on every push to `main` and on version tags.

### 1. Tag a release

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow builds and pushes `ghcr.io/mortennordbye/workout:v1.0.0` to the GitHub Container Registry.

### 2. Update the image tag in `k8s/app.yaml`

```yaml
image: ghcr.io/mortennordbye/workout:v1.0.0
```

### 3. Commit and push

```bash
git add k8s/app.yaml
git commit -m "chore: bump image to v1.0.0"
git push
```

## Teardown

```bash
kubectl delete namespace workout
```

> **Note:** Deleting the namespace removes the PVC and all data. Back up first if needed.
