# Alumni Platform API (CW1)

## Environment Variables

A template is provided at the repository root:

```bash
cp .env.example .env
```

Key variables used by the app and worker:

- `DATABASE_URL`: PostgreSQL connection string.
- `NODE_ENV`, `PORT`: Runtime mode and HTTP port. Set `NODE_ENV=production` to enable secure cookies.
- `JWT_SECRET`, `JWT_EXPIRES_IN`: JWT signing secret and token lifetime.
- `ACCESS_TOKEN_COOKIE_NAME`, `ACCESS_TOKEN_COOKIE_SAMESITE`: Access-token cookie configuration.
- `CSRF_SECRET`, `CSRF_COOKIE_NAME`, `CSRF_COOKIE_SAMESITE`: CSRF token/cookie configuration.
- `ALLOWED_ORIGINS`: Comma-separated CORS allowlist.
- `RATE_LIMIT_ENABLED`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `RATE_LIMIT_TRUST_PROXY`: API rate-limit settings.
- `BCRYPT_SALT_ROUNDS`: Password hashing cost.
- `EMAIL_VERIFICATION_TTL_HOURS`, `PASSWORD_RESET_TTL_HOURS`: Auth token expiry windows.
- `EMAIL_TRANSPORT`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `EMAIL_FROM`: Outbound email configuration.
- `APP_BASE_URL`: Used to build links in emails.
- `ANALYTICS_DASHBOARD_API_TOKEN`: Server-side bearer token used when the logged-in dashboard proxies to `/api/v1/analytics/alumni-dashboard`.
- `INTERNAL_API_BASE_URL`: Base URL the dashboard proxy uses for internal calls to the protected analytics API. Defaults to `APP_BASE_URL`, then `http://127.0.0.1:$PORT`.
- `STORAGE_PROVIDER`, `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_PUBLIC_URL`: Profile image storage configuration. Use `minio` for Docker and production. `local` is only allowed outside production.
- `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_PASSWORD`: First-admin bootstrap credentials.
- `SCHEDULER_SYSTEM_EMAIL`, `SCHEDULER_TICK_MS`, `SPONSORSHIP_EXPIRY_INTERVAL_MS`, `RATE_LIMIT_CLEANUP_INTERVAL_MS`: Worker/scheduler settings.
- `TEST_DB_PORT`: Port override for `docker-compose.test.yml`.

## Run locally with Docker Compose

From the project root:

```bash
cd CW1
docker compose up --build
```

This starts:
- `db` (PostgreSQL on `localhost:5432`)
- `app` (Node/Express on `localhost:3000`)
- `mailhog` (SMTP on `localhost:1025`, inbox UI on `localhost:8025`)
- `minio` (object storage on `localhost:9000`, console on `localhost:9001`)

To stop:

```bash
cd CW1
docker compose down
```

To stop and remove DB volume:

```bash
cd CW1
docker compose down -v
```

For local email testing, open:

```text
http://localhost:8025
```

Auth emails (verification/reset) are captured there in development.

For local object storage, open:

```text
http://localhost:9001
```

Default MinIO credentials in Docker Compose:
- Username: `minioadmin`
- Password: `minioadmin`

## Run production docker compose 

1. Copy the root env file template and adjust secrets and URLs:

```bash
cp ../.env.example ../.env
```

2. From the `CW1/` directory, build the production image:

```bash
docker compose --env-file ../.env -f docker-compose.prod.yml build
```

3. Start the full stack:

```bash
docker compose --env-file ../.env -f docker-compose.prod.yml up -d
```

4. Check the deployment:

```bash
curl http://localhost:8080/healthz
```

Profile image storage in production:
- set `NODE_ENV=production`
- set `STORAGE_PROVIDER=minio`
- do not use `STORAGE_PROVIDER=local` in production; the app will reject it at startup

## First Admin Bootstrap

On startup, the app auto-creates the first admin account if no admin exists yet.
This bootstrap is permanently locked after the first admin is present.

Environment variables (preferred):

- `BOOTSTRAP_ADMIN_EMAIL` (or `BOOTSTRAP_ADMIN_USERNAME`)
- `BOOTSTRAP_ADMIN_PASSWORD`

If not provided, fallback defaults are used:

- Email: `admin@eastminster.ac.uk`
- Password: `ChangeMe!123!`

Use strong env values before first startup in non-local environments.

## Postman collection

Postman collection is stored in the file system at `/CW1/postman/` and `/CW1/.postman`.

## Run Tests

From the project root:

```bash
cd CW1
```

Run unit tests only:

```bash
npm test
```

Run integration tests (starts test DB automatically):

```bash
npm run test:integration
```

Run integration tests in CI-style mode (tears test DB down automatically):

```bash
npm run test:integration:ci
```

## Run Scheduler Worker

From the project root:

```bash
cd CW1
npm run worker
```

The worker runs:
- daily winner selection at `00:00 UTC` (automatic fallback still available via `/admin/winners`)
- sponsorship offer expiry sweep every 5 minutes

## CORS and CSRF

Security middleware is enabled for API routes:
- CORS origin allowlist via `ALLOWED_ORIGINS` (comma-separated)
- CSRF protection on all mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`)

Recommended environment variables:
- `ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend.example`
- `CSRF_SECRET=<strong-random-secret>`
- optional `CSRF_COOKIE_NAME` (default `csrf_token`)

Mutating requests must include:
- cookie: `csrf_token=<token>`
- header: `X-CSRF-Token: <same token>`

`POST /api/v1/auth/sessions` is CSRF-exempt to bootstrap login and will set both `access_token` and `csrf_token` cookies.
For other mutating requests, include matching cookie + `X-CSRF-Token` header.

## Run Prisma Migrations

From the project root:

```bash
cd CW1
```

Apply existing migrations to the current database:

```bash
npx prisma migrate deploy
```
for docker:
```bash
cd CW1
docker compose exec app npx prisma migrate deploy
```

Create and apply a new migration during development:

```bash
npx prisma migrate dev --name <migration_name>
```
