# Deployment Guide - Smart Workout PWA

**IMPORTANT: This project enforces container-only development. All deployment options use Docker.**

Complete deployment guide for running the Smart Workout PWA in Docker Compose (development) or Kubernetes (production).

---

## Table of Contents

1. [Development (Docker Compose)](#development-docker-compose)
2. [Production (Docker)](#production-docker)
3. [Production (Kubernetes)](#production-kubernetes)
4. [Database Management](#database-management)
5. [Environment Variables](#environment-variables)
6. [Troubleshooting](#troubleshooting)

---

## Development (Docker Compose)

Docker Compose runs both the application and PostgreSQL database together.

#### Quick Start

1. **Build and Start**

   ```bash
   docker-compose up --build
   ```

2. **Access Application**
   - App: http://localhost:3000
   - Health: http://localhost:3000/api/health
   - Ready: http://localhost:3000/api/ready

3. **Run Migrations**

   ```bash
   docker-compose exec app pnpm db:migrate
   ```

4. **View Logs**

   ```bash
   # All services
   docker-compose logs -f

   # Specific service
   docker-compose logs -f app
   ```

5. **Stop**

   ```bash
   docker-compose down

   # Remove volumes (deletes database data)
   docker-compose down -v
   ```

#### Production Docker Build

For manual Docker deployment without docker-compose:

1. **Build Image**

   ```bash
   docker build -t workout-pwa:latest .
   ```

2. **Run Container**

   ```bash
   docker run -d \
     --name workout-app \
     -p 3000:3000 \
     -e DATABASE_URL='postgresql://user:password@host:5432/workout_db' \
     -e NODE_ENV=production \
     workout-pwa:latest
   ```

3. **Push to Registry** (for Kubernetes)

   ```bash
   # Tag for your registry
   docker tag workout-pwa:latest your-registry.io/workout-pwa:v1.0.0

   # Push
   docker push your-registry.io/workout-pwa:v1.0.0
   ```

---

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (k3s, k8s, minikube, etc.)
- kubectl installed and configured
- Ingress controller (nginx-ingress or traefik)
- Container registry (DockerHub, GHCR, or private registry)

### Deployment Steps

See [k8s/README.md](k8s/README.md) for comprehensive Kubernetes deployment guide.

#### Quick Start

1. **Build and Push Image**

   ```bash
   docker build -t your-registry.io/workout-pwa:v1.0.0 .
   docker push your-registry.io/workout-pwa:v1.0.0
   ```

2. **Update Image Reference**
   Edit `k8s/deployment.yaml`:

   ```yaml
   spec:
     containers:
       - name: workout-pwa
         image: your-registry.io/workout-pwa:v1.0.0
   ```

3. **Create Namespace**

   ```bash
   kubectl apply -f k8s/namespace.yaml
   ```

4. **Configure Secrets**

   ```bash
   kubectl create secret generic workout-app-secret \
     --from-literal=DATABASE_URL='postgresql://user:password@postgres:5432/workout_db' \
     -n workout-app
   ```

5. **Deploy Application**

   ```bash
   kubectl apply -f k8s/configmap.yaml
   kubectl apply -f k8s/deployment.yaml
   kubectl apply -f k8s/service.yaml
   kubectl apply -f k8s/ingress.yaml
   ```

6. **Verify Deployment**

   ```bash
   kubectl get pods -n workout-app
   kubectl logs -n workout-app -l app=workout-pwa
   ```

7. **Access Application**

   ```bash
   # Port forward for testing
   kubectl port-forward -n workout-app svc/workout-pwa 3000:3000

   # Or via Ingress (configure DNS/hosts file)
   # http://workout.homelab.local
   ```

---

## Database Management

### Migrations

Drizzle Kit manages database schema changes through migrations.

#### Generate Migration

**Run inside Docker container:**

```bash
docker-compose exec app pnpm db:generate
```

This creates SQL migration files in `drizzle/` directory.

#### Apply Migrations

**Development:**

```bash
docker-compose exec app pnpm db:push
```

**Production:**

```bash
# Docker
docker-compose exec app pnpm db:migrate

# Kubernetes
kubectl exec -it -n workout-app deployment/workout-pwa -- pnpm db:migrate
```

### Backup and Restore

#### Backup PostgreSQL Database

```bash
# Docker Compose (Development)
docker-compose exec postgres pg_dump -U postgres workout_db > backup.sql

# Docker Standalone
docker exec workout-postgres pg_dump -U postgres workout_db > backup.sql

# Kubernetes
kubectl exec -n workout-app postgres-pod -- \
  pg_dump -U postgres workout_db > backup.sql
```

#### Restore Database

```bash
# Docker Compose (Development)
docker-compose exec -i postgres psql -U postgres workout_db < backup.sql

# Docker Standalone
docker exec -i workout-postgres psql -U postgres workout_db < backup.sql

# Kubernetes
kubectl exec -i -n workout-app postgres-pod -- \
  psql -U postgres workout_db < backup.sql
```

---

## Environment Variables

### Required Variables

| Variable       | Description                  | Example                               | Required    |
| -------------- | ---------------------------- | ------------------------------------- | ----------- | ------ |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` | ✅ Yes      |
| `NODE_ENV`     | Environment mode             | `development                          | production` | ✅ Yes |

### Optional Variables

| Variable                  | Description               | Default             |
| ------------------------- | ------------------------- | ------------------- |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | `1`                 |
| `NEXT_PUBLIC_APP_NAME`    | Application name          | `Smart Workout PWA` |
| `NEXT_PUBLIC_APP_VERSION` | App version               | `0.1.0`             |

### Setting Environment Variables

#### Docker Compose (Development)

Edit `docker-compose.yml`:

```yaml
services:
  app:
    environment:
      DATABASE_URL: postgresql://...
      NODE_ENV: development
```

#### Kubernetes

Use ConfigMaps (non-sensitive) and Secrets (sensitive):

```bash
kubectl create configmap workout-app-config \
  --from-literal=NODE_ENV=production \
  -n workout-app

kubectl create secret generic workout-app-secret \
  --from-literal=DATABASE_URL='postgresql://...' \
  -n workout-app
```

---

## Troubleshooting

### Development Issues

#### Port Already in Use

```bash
# Find and stop existing Docker containers
docker-compose down

# Or find process using port 3000
lsof -i :3000
kill -9 <PID>
```

#### Database Connection Failed

```bash
# Check PostgreSQL is running in container
docker-compose exec postgres psql -U postgres -c "SELECT version();"

# Check from app container
docker-compose exec app node -e "console.log(process.env.DATABASE_URL)"

# Check connection string format
# postgresql://username:password@host:port/database
```

#### Type Errors After Schema Changes

```bash
# Regenerate types (in container)
docker-compose exec app pnpm db:generate

# Restart development container
./scripts/docker-rebuild.sh

# Restart TypeScript server in VS Code
# Cmd/Ctrl + Shift + P > "TypeScript: Restart TS Server"
```

### Docker Issues

#### Image Build Fails

```bash
# Clear build cache
docker builder prune

# Build with no cache
docker build --no-cache -t workout-pwa:latest .
```

#### Container Crashes on Startup

```bash
# View logs
docker logs workout-app

# Common causes:
# - Missing DATABASE_URL environment variable
# - Database not accessible from container
# - Port 3000 already in use
```

#### Can't Connect to Database

```bash
# Check network
docker network ls
docker network inspect workout_default

# Test connectivity
docker exec workout-app ping postgres
```

### Kubernetes Issues

#### Pods Not Starting (ImagePullBackOff)

```bash
# Check image exists
kubectl describe pod -n workout-app workout-pwa-xxxxx

# Verify image name and tag
kubectl get deployment -n workout-app workout-pwa -o yaml | grep image:

# Check image pull secrets (if using private registry)
kubectl get secrets -n workout-app
```

#### Readiness Probe Failing

```bash
# Check probe endpoint manually
kubectl port-forward -n workout-app svc/workout-pwa 3000:3000
curl http://localhost:3000/api/ready

# View pod logs
kubectl logs -n workout-app -l app=workout-pwa

# Check database connectivity from pod
kubectl exec -it -n workout-app deployment/workout-pwa -- \
  wget -qO- http://localhost:3000/api/ready
```

#### CrashLoopBackOff

```bash
# View crash reason
kubectl describe pod -n workout-app workout-pwa-xxxxx

# Check previous logs (before crash)
kubectl logs -n workout-app workout-pwa-xxxxx --previous

# Common causes:
# - Missing DATABASE_URL secret
# - Database not accessible
# - Application code errors
```

### PWA Issues

#### Service Worker Not Updating

```bash
# Clear browser cache
# Chrome: DevTools > Application > Clear Storage

# Unregister service worker
# Chrome: DevTools > Application > Service Workers > Unregister

# Force update
# In browser console:
navigator.serviceWorker.getRegistrations().then(regs =>
  regs.forEach(reg => reg.unregister())
);
```

#### App Not Installing

- Ensure HTTPS (required for PWA except localhost)
- Check manifest.json is valid: DevTools > Application > Manifest
- Verify icons exist in /public/
- Service worker must be registered successfully

---

## Performance Optimization

### Database

- Add indexes to frequently queried columns
- Use connection pooling (already configured)
- Monitor slow queries with `EXPLAIN ANALYZE`

### Application

- Enable Next.js caching strategies
- Optimize images with next/image
- Implement pagination for large datasets
- Use React.memo for expensive components

### Kubernetes

- Set appropriate resource limits
- Enable Horizontal Pod Autoscaler (HPA)
- Use persistent volumes for database
- Implement caching layer (Redis)

---

## Security Checklist

- [ ] Use strong database passwords
- [ ] Enable SSL/TLS for database connections
- [ ] Set up HTTPS with valid certificates (cert-manager)
- [ ] Implement rate limiting on API routes
- [ ] Use Kubernetes Network Policies
- [ ] Scan Docker images for vulnerabilities (Trivy)
- [ ] Enable RBAC in Kubernetes
- [ ] Use secrets management (Sealed Secrets, Vault)
- [ ] Implement authentication (Next-Auth, Clerk, etc.)
- [ ] Enable CORS only for trusted origins
- [ ] Keep dependencies updated (Dependabot)

---

## Monitoring and Observability

### Health Checks

- Liveness: `GET /api/health`
- Readiness: `GET /api/ready`

### Logging

```bash
# Docker
docker logs -f workout-app

# Kubernetes
kubectl logs -f -n workout-app -l app=workout-pwa

# Export logs to file
kubectl logs -n workout-app -l app=workout-pwa --tail=1000 > logs.txt
```

### Metrics (Future Enhancement)

- Integrate Prometheus for metrics
- Use Grafana for visualization
- Track workout logging rates
- Monitor database query performance

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Serwist PWA Documentation](https://serwist.pages.dev/)

---

## Support

For issues or questions:

1. Check this documentation
2. Review logs for error messages
3. Consult the troubleshooting section
4. Check GitHub issues (if applicable)

---

**Last Updated:** March 6, 2026
**Version:** 0.1.0
