# Kubernetes Deployment

Deploys [workout](https://github.com/mortennordbye/workout) — a Next.js PWA — plus a PostgreSQL database into a `workout` namespace.

## Prerequisites

- Docker
- `kubectl` pointed at your cluster
- A container registry you can push to (e.g. `ghcr.io/mortennordbye/workout-app`)
- [external-secrets-operator](https://external-secrets.io) installed with a `ClusterSecretStore` named `bitwarden-secretsmanager`
- Gateway API with a `Gateway` named `traefik-gateway-private` in the `traefik` namespace

## 1. Build & push the image

```bash
IMAGE=ghcr.io/mortennordbye/workout-app:v1 PUSH=true ./scripts/build-prod.sh
```

## 2. Update the image tag

Open `k8s/app.yaml` and update the `image:` line to match your registry and tag:

```yaml
image: ghcr.io/mortennordbye/workout-app:v1
```

## 3. Apply

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/externalsecret.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/app.yaml
kubectl apply -f k8s/httproute.yaml
```

> The ExternalSecret must be applied before the postgres and app pods start, as both reference the `workout-secret` it creates.

## 4. Watch pods come up

```bash
kubectl get pods -n workout -w
```

Both pods should reach `Running` / `1/1` (the app pod takes ~45 s for migrations).

## 5. Access

The app is available at `http://workout.local.bigd.no` via the Traefik gateway.

For direct port-forward access:

```bash
kubectl port-forward -n workout svc/workout-app 3000:3000
# → http://localhost:3000
```

## Teardown

```bash
kubectl delete namespace workout
```

> **Note:** Deleting the namespace removes the PVC and all data. Back up first if needed.
