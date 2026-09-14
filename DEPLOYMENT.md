# Deployment

Deployment notes for HN Medical System. This document grows as the deployment
phases land; today it covers persistent storage, which must be configured
correctly before any media is uploaded.

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
chown -R 1001:1001 /data/hnmedical      # adjust to the container's runtime UID
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

The application exposes `ensureStorageReady()`, which creates the folder tree
and asserts the volume is readable and writable. The healthcheck endpoint calls
it once that endpoint exists, so a misconfigured mount will fail the deploy
rather than surfacing as the first failed upload.

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
| `UPLOAD_ROOT` | Absolute path to the media volume |
