# syntax=docker/dockerfile:1
#
# HN Medical System — production image.
#
# Built without a database: Coolify builds before the application is linked to
# its PostgreSQL service. See DEPLOYMENT.md for how pages prerendered against
# an empty database are replaced at start-up, before the instance is healthy.

ARG NODE_IMAGE=node:22-bookworm-slim

# --------------------------------------------------------------- deps -----
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# postinstall runs `prisma generate`, which needs the schema copied above.
RUN npm ci --no-audit --no-fund

# ------------------------------------------------------------ builder -----
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    BUILD_WITHOUT_DATABASE=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# public/ holds nothing the application ships yet, and git does not keep an
# empty folder, so a fresh clone has none; the runtime stage copies it.
RUN mkdir -p public
RUN npx prisma generate \
 && npx next build
# The operational scripts, bundled with everything they import, so they
# run in the slim runtime image without the source tree or dev dependencies.
RUN mkdir -p ops \
 && for script in bootstrap-admin seed-states check-env; do \
      node_modules/.bin/esbuild "scripts/${script}.ts" --bundle --platform=node \
        --format=esm --target=node22 --outfile="ops/${script}.mjs" --log-level=warning \
        --banner:js='import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);'; \
    done

# ----------------------------------------------------------- migrator -----
# Only the Prisma CLI, at the exact version the lockfile pins, to apply
# migrations at start-up. Kept out of the application's node_modules.
FROM ${NODE_IMAGE} AS migrator
WORKDIR /migrate
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY package.json /tmp/package.json
COPY package-lock.json /tmp/package-lock.json
RUN PRISMA_VERSION="$(node -p "require('/tmp/package-lock.json').packages['node_modules/prisma'].version")" \
 && DOTENV_VERSION="$(node -p "require('/tmp/package-lock.json').packages['node_modules/dotenv'].version")" \
 && npm init -y >/dev/null \
 # The application's security overrides for the CLI's own dependencies
 # (plain version pins only; references to the app's dependencies do not apply).
 && node -e "const fs=require('fs');const p=require('./package.json');const o=require('/tmp/package.json').overrides||{};p.overrides=Object.fromEntries(Object.entries(o).filter(([,v])=>typeof v==='string'&&!v.startsWith('$')));fs.writeFileSync('package.json',JSON.stringify(p,null,2))" \
 && npm install --no-audit --no-fund --omit=dev "prisma@${PRISMA_VERSION}" "dotenv@${DOTENV_VERSION}" \
 # An embedded Postgres for `prisma dev`; migrate never loads it. (Studio and
 # @prisma/dev look just as unused but the CLI imports them at start-up.)
 && rm -rf node_modules/@electric-sql
COPY prisma ./prisma
COPY prisma.config.ts ./

# ------------------------------------------------------------- runner -----
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
# curl is for Coolify's health check, which runs curl (or wget) inside the
# container; the image's own HEALTHCHECK below needs only node.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates curl \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 hnmedical \
 && useradd --system --uid 1001 --gid hnmedical --no-create-home hnmedical \
 && mkdir -p /data/hnmedical/uploads /data/hnmedical/backups \
 && chown -R hnmedical:hnmedical /data/hnmedical

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_ROOT=/data/hnmedical/uploads \
    BACKUP_ROOT=/data/hnmedical/backups \
    HN_READY_FILE=/tmp/hn-ready \
    HN_WARM_TOKEN_FILE=/tmp/hn-warm-token

COPY --from=builder --chown=hnmedical:hnmedical /app/.next/standalone ./
COPY --from=builder --chown=hnmedical:hnmedical /app/.next/static ./.next/static
COPY --from=builder --chown=hnmedical:hnmedical /app/public ./public
COPY --from=builder --chown=hnmedical:hnmedical /app/ops ./ops
COPY --from=migrator --chown=hnmedical:hnmedical /migrate ./migrate
COPY --chown=hnmedical:hnmedical docker/entrypoint.sh docker/warm.mjs ./docker/
RUN chmod 0755 docker/entrypoint.sh

USER hnmedical
EXPOSE 3000
VOLUME ["/data/hnmedical/uploads", "/data/hnmedical/backups"]

# Healthy only once the database answers, the media volume is writable and
# start-up warm-up has finished.
HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/app/docker/entrypoint.sh"]
