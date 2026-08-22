# Stunning Dentistry — CRM Backend

Backend API for the Stunning Dentistry CRM. It manages the pre-clinical patient
journey — **lead capture → nurture → appointment booked on the calendar** — for a
multi-branch dental practice. Clinical records, treatment plans, and payments are
intentionally out of scope; the CRM hands off once an appointment is booked.

> ⚠️ **Status: actively in development.** The domain model (leads, patients,
> doctors, appointments, consent) is being built out phase by phase. Expect the
> schema and API surface to keep growing. Only the routes documented in Swagger
> are wired up today.

The service is built with data-protection baked in from the start: staff-only
OTP login, column-level encryption of PII (AES-256-GCM), blind-index dedup, and
DPDP Act 2023 retention/erasure semantics.

---

## Tech stack

| Concern            | Choice                                             |
| ------------------ | -------------------------------------------------- |
| Runtime            | Node.js 24 + TypeScript (CommonJS), run via `tsx`  |
| Web framework      | Express 5                                          |
| Database           | PostgreSQL 16 (via TypeORM, hand-written migrations) |
| Cache / queue      | Redis 7 + BullMQ (background jobs, e.g. email)     |
| Auth               | Email OTP → JWT (access + refresh)                 |
| Validation         | Zod                                                |
| API docs           | Swagger UI (OpenAPI 3)                             |
| Logging            | Pino                                               |
| Email              | Nodemailer (Google Workspace SMTP) / console       |
| DB admin UI        | Adminer (dev only)                                 |
| Lint / format      | ESLint + Prettier, enforced via Husky + lint-staged |
| Commits            | Conventional Commits (commitlint)                  |

---

## Prerequisites

Install these before you start:

- **Node.js 24+** and **npm** (the repo is developed on Node `v24`)
- **Docker** + **Docker Compose** (for Postgres, Redis, and Adminer)
- **git**

You do **not** need Postgres or Redis installed locally — they run in Docker.

---

## Quick start (new developer)

From a fresh clone, this gets you a running API with a seeded database in a few
minutes.

```bash
# 1. Install dependencies (also sets up Husky git hooks via the "prepare" script)
npm install

# 2. Create your local env file from the template
cp .env.example .env

# 3. Generate the two 32-byte encryption keys and paste them into .env
#    (DATA_ENCRYPTION_KEY and BLIND_INDEX_KEY)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 4. Start Postgres + Redis in Docker (waits until they're healthy)
npm run db:up

# 5. Create the schema — run all migrations
npm run migration:run

# 6. Seed reference data (branches, doctors, staff logins, assignment cursors)
npm run seed

# 7. Start the API + background worker (hot-reload)
npm run dev
```

Then open:

- **API**: `http://localhost:3000` (whatever `PORT` you set — see the note below)
- **Swagger UI**: `http://localhost:3000/docs`
- **Health check**: `http://localhost:3000/health`

### First login (getting a token)

Login is **staff-only** — only the emails created by `npm run seed` can log in.
The seed creates these accounts:

| Email                                | Role  | Team          |
| ------------------------------------ | ----- | ------------- |
| `harshit@stunningdentistry.in`       | ADMIN | Both          |
| `hod@stunningdentistry.in`           | HOD   | Both          |
| `crm.domestic@stunningdentistry.in`  | CRM   | Domestic      |
| `crm.intl@stunningdentistry.in`      | CRM   | International  |

With `EMAIL_PROVIDER=console` (the default in `.env.example`), the OTP is **printed
to the API logs** — no mail credentials needed. To log in:

1. `POST /api/v1/otp/create` with `{ "email": "harshit@stunningdentistry.in" }`
2. Copy the OTP from the API console output.
3. `POST /api/v1/otp/verify` with `{ "email": ..., "otp": ... }` → returns an
   `accessToken` + `refreshToken`.
4. In Swagger, click **Authorize** and paste the `accessToken` (no `Bearer `
   prefix) to call protected routes like `/leads`.

---

## npm scripts

Full reference of everything in [package.json](package.json):

### Running the app

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the **API** (`src/index.ts`) and the **background worker** (`src/workers/index.ts`) together with hot-reload, using `concurrently`. |
| `npm run typecheck` | `tsc --noEmit` — type-checks the whole project without emitting JS. |

### Database — Docker services

| Command | What it does |
| --- | --- |
| `npm run db:up` | Start **Postgres + Redis** (detached), waiting for healthchecks. |
| `npm run db:tools` | Start Postgres, Redis **and Adminer** (the `tools` profile). |
| `npm run db:start` | Start previously-created containers. |
| `npm run db:stop` | Stop containers (keeps data). |
| `npm run db:restart` | Restart containers. |
| `npm run db:down` | Stop **and remove** containers (data volumes persist). |

### Database — migrations & seed

| Command | What it does |
| --- | --- |
| `npm run migration:run` | Apply all pending migrations to the DB. |
| `npm run migration:revert` | Roll back the most recent migration. |
| `npm run migration:create` | Prompt for a name and scaffold a new empty migration in `src/migration/` (via [scripts/new-migration.sh](scripts/new-migration.sh)). |
| `npm run seed` | Populate branches, doctors, staff logins, and assignment cursors ([src/db/seed.ts](src/db/seed.ts)). Idempotent — safe to re-run. |
| `npm run typeorm` | Raw TypeORM CLI passthrough (rarely needed directly). |

### Code quality

| Command | What it does |
| --- | --- |
| `npm run lint` | ESLint over `src`. |
| `npm run lint:fix` | ESLint with `--fix`. |
| `npm run format` | Prettier-format all `src/**/*.ts`. |

---

## Database, migrations & Adminer

### Migrations

The project uses **hand-written TypeORM migrations** — `synchronize` is off, so
the schema only ever changes through a migration. There is **one migration per
table**, applied in a dependency-safe order (see [src/migration/](src/migration/)).
The [data source](src/data-source.ts) points TypeORM at `src/entities/**` and
`src/migration/**`.

Typical loop when adding a schema change:

```bash
npm run migration:create   # scaffolds src/migration/<timestamp>-<name>.ts
# ...hand-write the up()/down() SQL (helpers in src/db/migration-helpers.ts)...
npm run migration:run      # apply it
npm run migration:revert   # undo if needed
```

> Migrations are only ever run when you explicitly run them — nothing auto-syncs
> the schema on boot.

### Adminer (DB UI, dev only)

Adminer is a lightweight Postgres web UI. It's behind the Docker `tools` profile
and **bound to `127.0.0.1` only** — it must never be added to a staging/prod
compose file.

```bash
npm run db:tools   # brings up Postgres + Redis + Adminer
```

Open **`http://localhost:4000`** and connect with:

- **System**: PostgreSQL
- **Server**: `postgres` (pre-filled — it's the Docker service name)
- **Username / Password / Database**: your `POSTGRES_*` values from `.env`

Remember the port clash: if your API also uses `4000`, set the API's `PORT=3000`.

---

## Project structure(As of 13/07/2026)

```
.
├── docker-compose.yml        # Postgres, Redis, Adminer (tools profile)
├── .env.example              # Template for your local .env
├── scripts/
│   └── new-migration.sh      # Prompts for a name, scaffolds a migration
└── src/
    ├── index.ts              # API entrypoint — connects DB, starts Express
    ├── app.ts                # Express app: middleware, routes, Swagger, error handler
    ├── data-source.ts        # TypeORM DataSource (entities + migrations)
    │
    ├── config/               # Env parsing/validation (env.ts) + Redis client
    ├── routes/               # Express routers → controllers (otp, auth, leads, health)
    ├── controllers/          # HTTP layer — parse request, call service, shape response
    ├── services/             # Business logic (lead, otp, token, email/*)
    ├── repositories/         # DB access helpers on top of TypeORM repos
    ├── entities/             # TypeORM entities = the domain model (see below)
    ├── migration/            # Hand-written schema migrations, one per table
    ├── db/                   # seed.ts (reference data) + migration-helpers.ts
    │
    ├── middleware/           # requireAuth, request validation, error handler
    ├── validations/          # Zod schemas for request bodies/params/queries
    ├── dtos/                 # Response shaping (e.g. decrypt PII, hide ciphertext cols)
    ├── types/                # Ambient/shared TS types (express augmentation, lead)
    │
    ├── queues/               # BullMQ queue definitions (email-queue)
    ├── workers/              # Background worker process (email-worker)
    │
    ├── docs/                 # Swagger / OpenAPI document
    └── utils/                # crypto, encryption, jwt, logger, normalize, errors, ...
```

---

## Conventions & git hooks

`npm install` installs [Husky](https://typicode.github.io/husky/) hooks
automatically (via the `prepare` script):

- **pre-commit** → runs `lint-staged` (ESLint `--fix` + Prettier on staged
  `.ts`) and then `npm run typecheck`. A commit fails if types don't check.
- **commit-msg** → runs `commitlint`, enforcing
  [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `chore:`, `docs:`, …).

Prettier config: 2-space indent, double quotes, semicolons, trailing commas,
80-col width ([.prettierrc.json](.prettierrc.json)).

---
