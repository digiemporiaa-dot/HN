# Launch checklist

A tick-list for taking HN Medical System live. Each step points to the
section of `DEPLOYMENT.md` that explains it.

## Before deploying

- [ ] Merge the development branch into `main` (or the branch Coolify will
      deploy) and confirm the GitHub CI workflow is green.
- [ ] DNS: `A` record for the bare domain and `CNAME` for `www` point at the
      server (*Going live with Coolify → 1*).
- [ ] On the server: `/data/hnmedical/uploads` and `/data/hnmedical/backups`
      exist and belong to uid/gid `1001` (*→ 2*).
- [ ] Generate `AUTH_SECRET` with `openssl rand -base64 32` and store a copy
      somewhere safe, outside the server.

## Coolify

- [ ] PostgreSQL 16 resource, not public; scheduled backups on (*→ 3*).
- [ ] Application from the repository, Dockerfile build pack, port `3000`,
      both domains (*→ 4*).
- [ ] Runtime variables: `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`
      (`https://…`, no path), `AUTH_TRUST_HOST=true`; `TRUSTED_PROXY_HOPS=2`
      only if Cloudflare sits in front (*→ 5*, *Environment variables*).
- [ ] Persistent storage for uploads and backups (*→ 6*).
- [ ] Health check `/api/health` on port `3000` (*→ 7*).
- [ ] Deploy; logs end with `[entrypoint] ready` (*→ 8*).

## First run

- [ ] `node ops/bootstrap-admin.mjs --email … --name "…"` in the Coolify
      Terminal; note the temporary password (*→ 9*).
- [ ] `node ops/seed-states.mjs`.
- [ ] Sign in, set a new password, set up two-factor authentication, and keep
      the recovery codes offline.

## In the admin

- [ ] Settings → Company, Contact, Branding: real details only.
- [ ] Settings → Email: SMTP, then **Send test email**.
- [ ] Settings → SEO: search-engine indexing allowed; default title and
      description; Search Console / Bing verification.
- [ ] Settings → Security: two-factor policy (default: privileged staff).
- [ ] Settings → Backups: schedule and hour (default daily, 02:00 IST,
      keep 14).
- [ ] Pages: homepage, About, Privacy policy, Terms — placeholders filled,
      published.
- [ ] Catalogue: categories, products, brands published.
- [ ] Demo content, if it was loaded: removed with
      `node ops/seed-demo.mjs --remove`, or every "Partner …" brand, `demo-`
      product and post, and the homepage's indicative figures replaced with
      real, verified ones (the homepage statistics note says so until edited).
- [ ] Blog (optional): publish articles, then add a "Blog" link (`/blog`) to
      the header or footer under Navigation.
- [ ] SEO → Redirects: one per address on the old site.
- [ ] Staff: accounts with the least access each person needs.

## Verify on the live domain

- [ ] `https://` loads with a valid certificate; `http://` redirects to it.
- [ ] `/api/health` returns `{"status":"ok", …}`.
- [ ] `/robots.txt` allows the site; `/sitemap.xml` lists real pages.
- [ ] Submit the contact form as a visitor: the enquiry appears under Leads
      and the notification email arrives.
- [ ] Backups → **Back up now**, then **Download**: the archive opens
      (`tar -tzf`).
- [ ] Submit the sitemap in Google Search Console.

## After launch

- [ ] Weekly: download the latest backup and keep it off the server.
- [ ] Weekly: glance at Audit Logs for failed sign-ins and unexpected
      exports.
- [ ] Monthly: `npm audit --omit=dev`, update, redeploy.
- [ ] Before any restore: read *Backups and restore*; everyone is signed out
      afterwards.
