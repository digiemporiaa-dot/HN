# Deployment

Deployment notes for HN Medical System. Start with **Going live with
Coolify**, a step-by-step guide; the sections after it explain the image,
storage and variables in detail. `LAUNCH-CHECKLIST.md` is the same journey as
a tick-list.

---

## Going live with Coolify

You need: a VPS with Coolify v4 installed, the domain's DNS, and this
repository on GitHub. Deploy from the branch you intend to run in production
(normally `main`, after merging the development branch into it).

### 1. Point the domain at the server

At your DNS provider, create:

| Type | Name | Value |
|---|---|---|
| `A` | `@` (the bare domain) | the server's public IPv4 address |
| `CNAME` | `www` | the bare domain |

Wait until `ping www.your-domain.com` answers from the server's IP. Coolify
can only issue the HTTPS certificate once DNS points at it.

### 2. Prepare the server's folders

Over SSH on the server, once:

```bash
mkdir -p /data/hnmedical/uploads /data/hnmedical/backups
chown -R 1001:1001 /data/hnmedical
chmod 750 /data/hnmedical/uploads /data/hnmedical/backups
```

### 3. Create the database

In Coolify: **Projects → your project → + New → Database → PostgreSQL**
(version 16). Leave it **not** publicly accessible. Start it, then open it and
copy the **internal** connection URL (`postgres://…@<container>:5432/…`).
Coolify backs up its databases on a schedule you can set here too — turn it
on; the application's own backups (media included) come on top of that.

### 4. Create the application

**+ New → Application →** your GitHub repository (via the Coolify GitHub
App for a private repository). Then:

| Setting | Value |
|---|---|
| Branch | `main` (or the branch you deploy) |
| Build Pack | **Dockerfile** |
| Dockerfile location | `/Dockerfile` |
| Ports Exposes | `3000` |
| Domains | `https://www.your-domain.com,https://your-domain.com` |

Coolify redirects one domain to the other if you set the redirect option;
choose the same address as `APP_URL` below as the primary one.

### 5. Environment variables

Under **Environment Variables**, add (mark them as runtime, not build-time —
the image is built without secrets):

```
DATABASE_URL=<the internal URL from step 3>
AUTH_SECRET=<output of: openssl rand -base64 32>
APP_URL=https://www.your-domain.com
AUTH_TRUST_HOST=true
```

Keep a copy of `AUTH_SECRET` somewhere safe: restoring a backup on a new
server needs the same value, or enrolled two-factor apps stop working.

### 6. Persistent storage

Under **Persistent Storage → + Add → Volume mount / Directory mount**:

| Source (host) | Destination (container) |
|---|---|
| `/data/hnmedical/uploads` | `/data/hnmedical/uploads` |
| `/data/hnmedical/backups` | `/data/hnmedical/backups` |

Without these, every uploaded image is lost on the next deploy.

### 7. Health check

Under **Health Check**, enable it with path `/api/health`, port `3000`.
(The image declares the same check; Coolify's setting makes the proxy wait
for it.) A new version only receives traffic once it reports healthy, so a
broken deploy leaves the previous one serving.

### 8. Deploy

Press **Deploy** and watch the logs. A good start ends with:

```
All migrations have been successfully applied.
[warm] / 200
…
[entrypoint] ready
```

If it stops with "The server cannot start: the environment is not configured
correctly", the lines below it name the variable to fix.

### 9. First run

Open the application's **Terminal** in Coolify and run:

```bash
node ops/bootstrap-admin.mjs --email you@your-domain.com --name "Your Name"
node ops/seed-states.mjs
```

The first prints a temporary password once; sign in at
`https://www.your-domain.com/login`, set a new password and enrol two-factor
authentication.

### 10. Automatic deploys

With the Coolify GitHub App, enable **Auto Deploy**: every push to the
deployed branch builds and rolls out a new version. The repository's CI
workflow (`.github/workflows/ci.yml`) runs lint, typecheck and the same
database-less build on every push, so a broken change shows up on GitHub
before it reaches the server.

### 11. Before announcing the site

In the admin, in this order:

1. **Settings → Company / Contact / Branding** — real name, phone, email,
   address, logo, colours.
2. **Settings → Mail** — SMTP details, then send the test email. Enquiry
   notifications depend on it.
3. **Settings → SEO** — confirm **"Ask search engines not to index this
   site" is off**, set the default title and description, and add the Search
   Console / Bing verification codes.
4. **Pages** — publish the homepage, About, Privacy policy and Terms (their
   placeholders must be filled in before they can be published).
5. **Catalogue** — categories, products, brands; publish them.
6. **SEO → Redirects** — add a redirect for each address from any old site.
7. **Staff** — create accounts with the least access each person needs.
   Anyone who can manage staff, roles or settings, or download or restore
   backups, must set up two-factor authentication at first sign-in
   (**Settings → Security**).
8. **Backups** — confirm a backup runs and can be downloaded (see
   *Backups and restore*).
9. Submit `https://www.your-domain.com/sitemap.xml` in Google Search Console.

### Without Coolify

`docker-compose.yml` runs the application and its own PostgreSQL on any
server with Docker: copy `.env.example` to `.env`, set `POSTGRES_PASSWORD`,
`AUTH_SECRET` and `APP_URL`, then `docker compose up -d --build`. Put a
TLS-terminating reverse proxy (Caddy, nginx) in front of port 3000. The
first-run commands are the same, via
`docker compose exec app node ops/bootstrap-admin.mjs …`.

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

To see the whole site populated before the real catalogue and copy are
ready, load demo content: ten equipment categories with sub-ranges, 28
products including a CT scanner and a digital X-ray room (studio cut-out
images, specifications, features, brochures and FAQs),
placeholder partner brands, specialties, solutions, clinical applications,
ten city pages, six blog posts, About / Service & support / Privacy / Terms
pages, a complete homepage, and a header menu if that is empty — all published, so the site
looks complete. Demo records are identifiable: every catalogue, post and
media slug starts `demo-`, brands are called "Partner Alpha", "Partner Beta"
and so on, the homepage figures are labelled as indicative, and there are no
prices, ratings, clients or certifications. Company details are only filled
in where the setting is still blank, and the previous values are restored on
removal. Loading it also switches on **"Ask search engines not to index this
site"**, so none of it is indexed. Nothing is seeded automatically: the
command has to be run by hand.

```bash
node ops/seed-demo.mjs            # add and publish the demo content
node ops/seed-demo.mjs --remove   # remove all of it
```

After either command, **restart the application** in Coolify so cached
pages are rebuilt. When the real content is in and the demo is removed,
switch indexing back on in **Settings → SEO**.

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
files that no longer exist. The application's own backups (next section)
capture both together.

---

## Backups and restore

**Admin → Backups.** Each backup is one `.tar.gz` archive holding every
database table (as JSON, read from a single consistent snapshot while the site
keeps running) and every uploaded file, plus a manifest listing the database
migrations it was made with.

### Schedule

**Settings → Backups** sets it: daily (default) or weekly on Sundays, at an
hour in India time (default 02:00), keeping the newest 14 scheduled backups
(older ones are deleted, file and all). The schedule runs inside the
application, so there is no cron to set up. Manual, pre-restore and uploaded
backups are never deleted automatically.

A scheduled backup that fails is shown as **Failed** in the list with the
reason, and is tried again at the next slot.

### Keep copies off the server

Archives live on the backup volume (`BACKUP_ROOT`), on the same server as the
site. That protects against mistakes — a deleted product, a bad import — but
not against losing the server. **Download a backup regularly (weekly at
least) and keep it somewhere else**: an office computer, an encrypted drive,
your own cloud storage. Treat the files as confidential: they contain every
enquiry, staff email and password hash.

Also turn on Coolify's own scheduled backups for the PostgreSQL resource
(step 3 above); they are an independent second copy of the database.

### Restoring

Open **Backups**, choose **Restore…** on an archive, re-enter your password
and type `RESTORE`. Then:

1. a **pre-restore** backup of the site as it is now is taken first — restore
   that one to undo;
2. every table and the whole uploads folder are replaced with the archive's
   contents, in a single database transaction (nothing changes if it fails);
3. the **audit log is kept** — entries since the backup are not rolled back;
4. **everyone is signed out**. Staff sign in with the password they had when
   the backup was made; accounts created since then no longer exist.

A backup made by a newer version of the application (one with database
migrations this deployment has not applied) is refused: deploy that version
first. Older backups restore into newer versions; columns added since take
their defaults.

Only roles with the Backups **Restore** permission can restore or upload
archives (by default, Super Admin only). Downloading needs **Export**. Every
backup, download, upload, restore and deletion is recorded in the audit log.

### Moving to a new server

1. On the old site: **Backups → Back up now**, then **Download**.
2. Deploy the new server as described above, with the **same `AUTH_SECRET`**
   (two-factor secrets are encrypted with it; with a different one, enrolled
   authenticator apps stop working and staff must re-enrol).
3. Create a first admin with `bootstrap-admin`, sign in, open **Backups →
   Upload an archive**, then **Restore…** the uploaded archive.
4. Sign in again with your account from the old site.

### Without the admin screen

If the application cannot start, the archive is an ordinary tarball:
`tar -xzf hnmedical-….tar.gz` gives `manifest.json`, `database/<Table>.json`
(each a JSON array of rows) and `uploads/`. The uploads can be copied back to
the media volume directly; the database is restored by the application once
it is running again.

---

## Environment variables

See `.env.example` for the full list with descriptions. A production server
checks these at start-up and **refuses to start** — printing which variable is
wrong, never its value — if a required one is missing or unsafe.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string (`postgresql://…`) |
| `AUTH_SECRET` | yes | At least 32 characters (`openssl rand -base64 32`). Signs sessions and encrypts two-factor secrets; changing it signs everyone out and invalidates enrolled authenticators. |
| `APP_URL` | yes | The public origin, `https://` and no path, e.g. `https://www.example.com` |
| `AUTH_TRUST_HOST` | yes | `true` — the app runs behind Coolify's proxy |
| `UPLOAD_ROOT` | set by the image | `/data/hnmedical/uploads`, the media volume |
| `BACKUP_ROOT` | set by the image | `/data/hnmedical/backups`, the backup volume (archives; see *Backups and restore*) |
| `TRUSTED_PROXY_HOPS` | no | Number of reverse proxies in front of the app (default `1`; `2` with Cloudflare in front of Coolify). Decides which `X-Forwarded-For` entry is the visitor, for sign-in limits and audit records. |
| `SKIP_MIGRATIONS` | no | `1` to stop the container applying migrations at start-up |
| `PORT` | no | Port inside the container (default `3000`) |

---

## Security

What the application enforces on its own, and what to keep an eye on.

**Sign-in.** Five wrong passwords for one account, or twenty from one
address, lock sign-in for 15 minutes — on the form and on the underlying
Auth.js endpoint alike. Wrong two-factor codes count too. The visitor's
address is taken from the entries our own proxies add to `X-Forwarded-For`
(see `TRUSTED_PROXY_HOPS`), so it cannot be chosen by the client. Error
messages never reveal whether an email has an account.

**Two-factor authentication.** **Settings → Security**:

| Value | Who must use an authenticator app |
|---|---|
| `privileged` (default) | Anyone who can manage staff, roles or settings, or download or restore backups |
| `everyone` | All staff |
| `off` | Nobody (optional for all) |

Until a required person has set it up, every admin screen sends them to
**My profile**, and they cannot turn it off. Keep the recovery codes offline.

**Sessions.** Sessions last 8 hours from the last activity. Each one is
listed under **My profile → Active sessions** and can be ended there;
changing a password, deactivating an account, or restoring a backup ends
every session at once.

**Content-Security-Policy.** Admin and sign-in screens use a per-request
nonce with `'strict-dynamic'`: only scripts the application emitted run
there. Public pages are cached, so they use an allow-list instead — this
site, Google Tag Manager / Analytics, and YouTube (privacy-enhanced) and
Vimeo players. A tag added inside Google Tag Manager that loads scripts from
another host will be blocked; add that host in `src/lib/security/csp.ts`.

**Files.** Uploads are checked against their real type, stored under random
names outside the web root, and served with `nosniff`; SVGs are sandboxed.
Files visitors attach to forms are only ever downloadable by staff, as
attachments.

**Audit log.** **Audit Logs** records sign-ins, failed sign-ins, changes,
exports, backups and restores, with filters and CSV export. Entries cannot be
edited or deleted from the application, and a restore does not roll them
back.

**Dependencies.** Run `npm audit --omit=dev` before each release; at the time
of writing it reports none. The remaining development-only advisories (lint
tooling) are not part of the production image.

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
