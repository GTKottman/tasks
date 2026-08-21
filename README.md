# Routine Tracker

A private React and Express routine tracker backed by PostgreSQL. Routine definitions are effective-dated, while each day's checklist stores labels and ordering as a snapshot so later edits do not rewrite history.

## Local setup

1. Copy `.env.example` to `.env`. Set a strong `OWNER_PASSWORD` and `SESSION_SECRET`.
2. Start PostgreSQL with `docker compose up -d db`, or use any PostgreSQL 15+ database.
3. Run `npm run prisma:generate`, `npm run prisma:migrate`, and `npm run seed`.
4. Run `npm run dev`, then open `http://localhost:5173`.

The seed is idempotent. On its first run it creates the owner from `OWNER_EMAIL` and `OWNER_PASSWORD`, then imports all four legacy routines. Later runs do not reset the owner's password. Change credentials directly through an administrative script or database process if needed.

The original static site and sound files are preserved in `backup/legacy-static/`.

## Production and Coolify

Deploy the repository in Coolify as a Docker Compose resource. Set `POSTGRES_PASSWORD` to a long URL-safe value, `OWNER_EMAIL`, `OWNER_PASSWORD` to at least 12 characters, and `SESSION_SECRET` to at least 32 random characters. Expose the `app` service on port 3000 and attach your domain to it. The included Compose file creates PostgreSQL and its persistent `routine_postgres` volume automatically. The app container runs `prisma migrate deploy` and the idempotent seed before starting.

If you deploy the Dockerfile instead of the Compose stack, provision PostgreSQL separately and set `DATABASE_URL` as well as the three owner/session variables.

Terminate TLS at Coolify's proxy. Production cookies are marked `Secure`, `HttpOnly`, and `SameSite=Lax`. Mutations additionally require a per-session CSRF token and same-origin requests.

## Migrations

During development, edit `prisma/schema.prisma` and run `npm run prisma:migrate`. Review and commit the generated migration. Production must only use `prisma migrate deploy`.

## Backup and restore

Create a backup:

```sh
docker compose exec -T db pg_dump -U routine -d routine_tracker -Fc > routine.dump
```

Restore into an empty database:

```sh
docker compose exec -T db pg_restore -U routine -d routine_tracker --clean --if-exists < routine.dump
```

Back up the PostgreSQL volume or database regularly. The application has no user-uploaded files.

## Quality checks

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
