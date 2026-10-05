#!/bin/sh
# Container start-up: migrate, serve, warm, then report ready.
set -eu

# 0. Refuse to start with a missing or unsafe environment, before touching
#    the database. Prints which variable is wrong, never its value.
node /app/ops/check-env.mjs

# 1. Apply pending migrations. `migrate deploy` only ever moves forward and
#    never resets or drops data. Set SKIP_MIGRATIONS=1 to run them separately.
if [ "${SKIP_MIGRATIONS:-0}" != "1" ]; then
  echo "[entrypoint] applying database migrations"
  (cd /app/migrate && node node_modules/prisma/build/index.js migrate deploy)
fi

# 2. A one-time token for the warm-up route, readable only by this user.
rm -f "$HN_READY_FILE"
umask 077
head -c 48 /dev/urandom | od -An -tx1 | tr -d ' \n' > "$HN_WARM_TOKEN_FILE"
umask 022

# 3. Serve, forwarding stop signals so Coolify's shutdown is graceful.
node /app/server.js &
server=$!
trap 'kill -TERM "$server" 2>/dev/null; wait "$server"; exit $?' TERM INT

# 4. Replace the empty prerendered pages before the healthcheck passes.
if node /app/docker/warm.mjs; then
  touch "$HN_READY_FILE"
  echo "[entrypoint] ready"
else
  echo "[entrypoint] warm-up failed; the instance will stay unhealthy" >&2
fi
rm -f "$HN_WARM_TOKEN_FILE"

wait "$server"
