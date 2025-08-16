# AgentHub Backend (Express + Prisma)

Production-grade Node.js API with PostgreSQL, Prisma, JWT, RBAC, validation, rate limiting, Docker, and k8s manifests.

## Quickstart

1) Install dependencies

```bash
cd backend
npm i
```

2) Set environment

```bash
cp .env.example .env
# Edit DATABASE_URL, JWT_SECRET, CORS_ORIGINS as needed
```

3) Prisma init

```bash
npx prisma generate
npx prisma migrate dev --name init
```

4) Run dev server

```bash
npm run dev
```

Open http://localhost:3000/health

## Docker

```bash
# From backend/
docker-compose up -d --build
# Stop
# docker-compose down -v
```

## Kubernetes

- Build and push an image tagged as `your-registry/agenthub-api:latest`
- Create ConfigMap and Secret:

```bash
kubectl create configmap agenthub-config \
  --from-literal=NODE_ENV=production \
  --from-literal=CORS_ORIGINS="http://localhost:3000" \
  --from-literal=RATE_LIMIT_WINDOW_MS=60000 \
  --from-literal=RATE_LIMIT_MAX=100

kubectl create secret generic agenthub-secrets \
  --from-literal=DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public" \
  --from-literal=JWT_SECRET="replace-with-strong-secret"

kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

## Testing

```bash
npm test
```

## Load testing (k6)

- Install k6: https://k6.io/docs/get-started/installation/

```bash
BASE_URL=http://localhost:3000 npm run load:test
```

The script logs in using `SEED_EMAIL`/`SEED_PASSWORD` env vars or defaults. Ensure a user exists or seed one.

## API Routes

- GET /health
- POST /auth/register { email, password, role? }
- POST /auth/login { email, password }
- GET /users (admin only) -> pagination via page & pageSize
- /projects
  - POST /projects
  - GET /projects
  - GET /projects/:id
  - PATCH /projects/:id
  - DELETE /projects/:id

## Notes

- Centralized error handler returns `{ error: { code, message, details } }`.
- Rate limits: global from env; stricter on /auth/*.
- In-memory caching added for `/users` listing.
