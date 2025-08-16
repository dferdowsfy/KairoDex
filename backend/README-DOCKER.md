# Docker usage

Build and run with compose:

```bash
# From backend/
docker-compose up -d --build
```

Healthchecks:
- Postgres: pg_isready
- API: GET /health

Stop:

```bash
docker-compose down -v
```
