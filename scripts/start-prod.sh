#!/usr/bin/env bash
# Production start: apply Prisma migrations, then bind Next.js to 0.0.0.0:$PORT.
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-3000}"
./node_modules/.bin/prisma migrate deploy
exec ./node_modules/.bin/next start --hostname 0.0.0.0 --port "$PORT"
