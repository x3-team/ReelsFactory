#!/usr/bin/env bash
# Честный цикл без скрейпа: 3 ссылки + Insights → profileSource=user → суфлёр.
# Не утверждает, что открыли @username.
set -euo pipefail
cd "$(dirname "$0")/.."

BASE="${BASE:-http://localhost:3000}"
PLAN="${PLAN:-FREE}"
TG_ID="${TG_ID:-$RANDOM$RANDOM}"
OUT="${OUT:-/tmp/user-links-run-$(date +%Y%m%d-%H%M%S).md}"

log() { printf '\n[user-links] %s\n' "$*"; }

health="$(curl -sf "$BASE/api/health" || true)"
if [ -z "$health" ]; then
  echo "[user-links] сервер не отвечает на $BASE — запусти pnpm dev" >&2
  exit 1
fi
echo "$health" | jq -c '{ok,version,honesty}'

LINKS="$(cat <<'EOF'
https://instagram.com/reel/UserLinkOne  торт без сахара, 12 тыс просмотров, 41% удержание
https://instagram.com/reel/UserLinkTwo  разлом зефира, 8 тыс
https://instagram.com/reel/UserLinkThree  фисташка и малина
EOF
)"

user_json="$(curl -sf -X POST "$BASE/api/users" \
  -H 'content-type: application/json' \
  -d "$(jq -nc --argjson id "$TG_ID" '{telegramId: $id, username: "user_links", firstName: "Links", languageCode: "ru"}')")"
USER_ID="$(echo "$user_json" | jq -r '.user.id')"
[ -n "$USER_ID" ] && [ "$USER_ID" != "null" ] || { echo "нет пользователя: $user_json" >&2; exit 1; }
log "пользователь $USER_ID"

if [ "$PLAN" != "FREE" ]; then
  psql "${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/reelsfactory}" -qc \
    "UPDATE \"User\" SET \"subscriptionPlan\" = '$PLAN', \"subscriptionExpiresAt\" = now() + interval '30 days' WHERE id = '$USER_ID';"
fi

onboard="$(curl -sS -o /tmp/ul-onboard.json -w "%{http_code}" -X POST "$BASE/api/users/onboard" \
  -H 'content-type: application/json' \
  -d "$(jq -nc --arg userId "$USER_ID" --arg links "$LINKS" '{
    userId: $userId,
    socialHandle: "@pastry.demo",
    profileGoal: "GROW_AUDIENCE",
    toneOfVoice: "DIRECT",
    nichePreset: "food",
    submittedReelsText: $links
  }')")"
echo "onboard HTTP $onboard $(jq -c '{handle: .user.socialHandle, error, code}' /tmp/ul-onboard.json)"
[ "$onboard" = "200" ] || exit 1

log "анализ"
analyze="$(curl -sS -o /tmp/ul-analyze.json -w "%{http_code}" -X POST "$BASE/api/analyze" \
  -H 'content-type: application/json' \
  -d "$(jq -nc --arg userId "$USER_ID" '{userId: $userId}')")"
echo "analyze HTTP $analyze $(jq -c '{id: .analysis.id, error, code}' /tmp/ul-analyze.json)"
ANALYSIS_ID="$(jq -r '.analysis.id // .id' /tmp/ul-analyze.json)"
[ -n "$ANALYSIS_ID" ] && [ "$ANALYSIS_ID" != "null" ] || exit 1

status="QUEUED"
for _ in $(seq 1 90); do
  poll="$(curl -sf "$BASE/api/analyze?id=$ANALYSIS_ID&userId=$USER_ID" || true)"
  status="$(echo "$poll" | jq -r '.analysis.status // "UNKNOWN"')"
  printf '  %s\n' "$status"
  [ "$status" = "COMPLETED" ] && break
  if [ "$status" = "FAILED" ]; then
    echo "$poll" | jq -r '.analysis.errorMessage'
    exit 1
  fi
  sleep 2
done
[ "$status" = "COMPLETED" ] || { echo "не завершился: $status" >&2; exit 1; }

result="$(curl -sf "$BASE/api/analyze?id=$ANALYSIS_ID&userId=$USER_ID")"
src="$(echo "$result" | jq -r '.analysis.profileSource')"
videos="$(echo "$result" | jq -r '.analysis.sourceVideos | length')"
script="$(echo "$result" | jq -r '.analysis.scripts[0].teleprompterScript // empty')"
views0="$(echo "$result" | jq -r '.analysis.sourceVideos[0].views // 0')"
ret0="$(echo "$result" | jq -r '.analysis.sourceVideos[0].retentionPct // 0')"

{
  echo "# User-links cycle (не live scrape)"
  echo
  echo "- profileSource: **$src**"
  echo "- роликов в «какие ролики взяли»: **$videos**"
  echo "- просмотры / удержание первого: **$views0** / **$ret0%**"
  echo "- сценариев: $(echo "$result" | jq '.analysis.scripts | length')"
  echo "- aiMocked: $(echo "$result" | jq -r '.analysis.aiMocked')"
  echo
  echo "## Суфлёр"
  echo
  echo '```'
  echo "$script"
  echo '```'
} > "$OUT"

echo "$result" | jq -c '{
  profileSource: .analysis.profileSource,
  aiMocked: .analysis.aiMocked,
  videos: [.analysis.sourceVideos[] | {url, views, retentionPct, caption}],
  title: .analysis.scripts[0].title,
  hasTeleprompter: ((.analysis.scripts[0].teleprompterScript // "") | length > 20)
}'

if [ "$src" != "user" ]; then
  echo "FAIL: profileSource=$src, ждали user" >&2
  exit 1
fi
if [ "$videos" -lt 3 ]; then
  echo "FAIL: мало sourceVideos" >&2
  exit 1
fi
if [ "${#script}" -lt 20 ]; then
  echo "FAIL: нет суфлёра" >&2
  exit 1
fi
if [ "$views0" != "12000" ]; then
  echo "FAIL: views первого ролика $views0" >&2
  exit 1
fi

echo
echo "OK user-links. Отчёт: $OUT"
