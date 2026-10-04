# Deployment

Deployment notes for HN Medical System: the container image, persistent
storage, environment variables and first-run steps.

---

## Container image

The repository's `Dockerfile` builds the production image. It is a
multi-stage build: dependencies, the Next.js build, a slim Prisma CLI for
migrations, and a runtime stage running the standalone server as an
unprivileged user (`hnmedical`, uid/gid **1001**).

```bash
docker build -t hnmedical .
```

### Built without a database

Coolify builds the image before the application is linked to its database,
so the build never connects to PostgreSQL. The build stage sets
`BUILD_WITHOUT_DATABASE=1`, and only during `next build` the database client
then answers every read as an empty database would (writes fail). Pages that
Next.js prerenders are therefore built as if the site were empty.

They never reach a visitor. At start-up the entrypoint:

1. applies pending migrations with `prisma migrate deploy` — forward-only; it
   never resets, drops or rewrites data (set `SKIP_MIGRATIONS=1` to run them
   as a separate step instead);
2. starts the server;
3. discards every prerendered page through a one-time, container-local warm-up
   route, and requests the main pages so they are regenerated from the real
   database;
4. only then marks the instance ready.

The healthcheck (`GET /api/health`) reports healthy only when the database
answers, the media volume is writable **and** warm-up has finished, so Coolify
keeps the previous container serving until the new one is genuinely ready.
After that, pages refresh on every save in the admin.

### What a failed deploy looks like

| Problem | Result |
|---|---|
| Database unreachable or a migration fails | The container exits with code 1; the deploy fails and the previous container keeps serving. |
| Database unreachable with `SKIP_MIGRATIONS=1` | The container stays unhealthy (`/api/health` → 503, `"database": false`) and receives no traffic. |
| Media volume missing or not writable | Unhealthy, `"storage": false`. |

`/api/health` returns which check failed and nothing else — no versions,
hostnames or error messages.

### First run on a new environment

Run these once, inside the running container (Coolify → the application →
**Terminal**):

```bash
# The first administrator. Omit --password to have one generated; it is
# printed once, and must be changed at first sign-in.
node ops/bootstrap-admin.mjs --email you@example.com --name "Your Name"

# India's states and union territories, for city pages.
node ops/seed-states.mjs
```

Both are safe to run again: the first refuses an email that already has an
account,
the second only adds what is missing.

---

## Persistent volumes

The application writes two kinds of data that must outlive a container:

| Purpose | Environment variable | Host path (suggested) | Container path |
|---|---|---|---|
| Media uploads | `UPLOAD_ROOT` | `/data/hnmedical/uploads` | `/data/hnmedical/uploads` |
| Backup archives | `BACKUP_ROOT` | `/data/hnmedical/backups` | `/data/hnmedical/backups` |

**These are not optional.** A container filesystem is discarded on every deploy,
rebuild, restart and replacement. Without a mounted volume, every uploaded image
and brochure disappears the next time the application is redeployed — and it
will not be obvious until someone looks at a product page.

Neither path is inside the web root, and neither is served by a web server
directly. Media is streamed through the application (`/api/media/file/...`) so
that path containment and, later, access rules stay under application control.

### Coolify configuration

In the Coolify application, under **Storages**, add a persistent volume for
each path:

1. **Name**: `hnmedical-uploads`
   **Source (host)**: `/data/hnmedical/uploads`
   **Destination (container)**: `/data/hnmedical/uploads`

2. **Name**: `hnmedical-backups`
   **Source (host)**: `/data/hnmedical/backups`
   **Destination (container)**: `/data/hnmedical/backups`

Then set the matching environment variables under **Environment Variables**:

```
UPLOAD_ROOT=/data/hnmedical/uploads
BACKUP_ROOT=/data/hnmedical/backups
```

On the host, create the directories and give them to the user the container
runs as before the first deploy:

```bash
mkdir -p /data/hnmedical/uploads /data/hnmedical/backups
chown -R 1001:1001 /data/hnmedical      # the image runs as uid/gid 1001
chmod 750 /data/hnmedical/uploads /data/hnmedical/backups
```

Where the host permits it, mount the uploads volume `noexec`. Nothing in the
application ever executes an uploaded file, and the files are written without
the executable bit, but defence in depth is cheap here.

### Verifying the mount

After deploying, confirm the volume is real rather than a directory inside the
container:

```bash
# Inside the container
touch /data/hnmedical/uploads/.mount-check && echo ok

# On the host — the file must be visible here too
ls -la /data/hnmedical/uploads/.mount-check
```

If the file does not appear on the host, the volume is **not** mounted and
uploads will be lost.

The healthcheck (`/api/health`) creates the folder tree and asserts the volume
is readable and writable, so a misconfigured mount fails the deploy rather
than surfacing as the first failed upload.

---

## Storage layout

Files are organised by purpose and sharded by year and month, so no directory
accumulates an unmanageable number of entries:

```
/data/hnmedical/uploads/
  products/2026/09/3f2a…b1.webp
  categories/…
  brands/…
  blogs/…
  pages/…
  cities/…
  brochures/…
  documents/…
  general/…
```

Stored filenames are random and bear no relation to the uploaded filename. That
removes any dependence on client-supplied text in a filesystem path, makes
collisions a non-issue, and means a file cannot be guessed at from the name of
the product it belongs to. The original filename is kept as metadata in the
database.

### Backing up media

A database dump is **not** a backup of this application. The `uploads` volume
must be captured alongside it, or a restore will bring back rows referencing
files that no longer exist. This is handled by the backup module; until then,
include `/data/hnmedical/uploads` in any manual backup.

---

## Environment variables

See `.env.example` for the full list with descriptions. Required so far:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Signs session tokens and encrypts two-factor secrets. Rotating it signs everyone out and invalidates enrolled authenticators. |
| `AUTH_TRUST_HOST` | `true` when running behind a reverse proxy |
| `APP_URL` | Public base URL, used for canonical URLs and metadata |
| `UPLOAD_ROOT` | Absolute path to the media volume (the image defaults it to `/data/hnmedical/uploads`) |

Optional:

| Variable | Purpose |
|---|---|
| `SKIP_MIGRATIONS` | `1` to stop the container applying migrations at start-up |
| `PORT` | Port the server listens on inside the container (default `3000`) |

---

## Reference data

Some data the application needs is loaded once per environment rather than
created in the admin. Each command only adds what is missing and never changes
a row an administrator has already edited, so it is safe to run again.

| Command | Loads |
|---|---|
| `npm run db:seed:states` | India's 28 states and 8 union territories, for filing city pages under. ISO codes are left blank to be filled from the current standard. |

Run after `npm run db:deploy` on a new environment, or inside the container
with `node ops/seed-states.mjs` (see *First run* above).
