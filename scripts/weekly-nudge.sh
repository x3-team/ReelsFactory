#!/usr/bin/env bash
# Render cron: Monday 08:00 UTC. Hits the web service; does not keep a Node process.
set -euo pipefail
BASE="${NEXT_PUBLIC_APP_URL:-}"
if [[ -z "$BASE" && -n "${WEB_HOST:-}" ]]; then
  BASE="https://${WEB_HOST}"
fi
if [[ -z "$BASE" ]]; then
  echo "NEXT_PUBLIC_APP_URL or WEB_HOST is required" >&2
  exit 1
fi
BASE="${BASE%/}"
AUTH=()
if [[ -n "${CRON_SECRET:-}" ]]; then
  AUTH=(-H "Authorization: Bearer ${CRON_SECRET}")
fi
curl -fsS -X POST "${BASE}/api/cron/weekly-nudge" "${AUTH[@]}"
echo
