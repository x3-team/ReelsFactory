#!/usr/bin/env bash
# Честный цикл без скрейпа: 3–5 URL + Insights → profileSource=user → суфлёр.
# YouTube-канал без ссылок — 400. Вставленные Shorts/видео — user, не скрейп канала.
# Не вызывает Apify. Не утверждает, что открыли @username.
set -euo pipefail
cd "$(dirname "$0")/.."

BASE="${BASE:-http://localhost:3000}"
PLAN="${PLAN:-FREE}"
OUT="${OUT:-/tmp/user-links-run-$(date +%Y%m%d-%H%M%S).md}"

log() { printf '\n[user-links] %s\n' "$*"; }

psql_db() {
  local url="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/reelsfactory}"
  printf '%s\n' "${url%%\?*}"
}

make_user() {
  local name="$1"
  local tg="${RANDOM}${RANDOM}"
  local json
  json="$(curl -sf -X POST "$BASE/api/users" \
    -H 'content-type: application/json' \
    -d "$(jq -nc --argjson id "$tg" --arg name "$name" '{telegramId: $id, username: $name, firstName: "Links", languageCode: "ru"}')")"
  local id
  id="$(echo "$json" | jq -r '.user.id')"
  [ -n "$id" ] && [ "$id" != "null" ] || { echo "нет пользователя: $json" >&2; exit 1; }
  if [ "$PLAN" != "FREE" ]; then
    psql "$(psql_db)" -qc \
      "UPDATE \"User\" SET \"subscriptionPlan\" = '$PLAN', \"subscriptionExpiresAt\" = now() + interval '30 days' WHERE id = '$id';"
  fi
  printf '%s\n' "$id"
}

assert_no_opened_account() {
  local blob="$1"
  if echo "$blob" | grep -Eiq 'открыли @|открыли аккаунт|разобрали живой|лайфстайл огонь|в био|шапк[аеи] профиля|подписчик'; then
    echo "FAIL: копирайт звучит как «открыли аккаунт»" >&2
    echo "$blob" | grep -Ei 'открыли @|открыли аккаунт|разобрали живой|лайфстайл огонь|в био|шапк[аеи] профиля|подписчик' >&2 || true
    exit 1
  fi
}

poll_analysis() {
  local analysis_id="$1"
  local user_id="$2"
  local status="QUEUED"
  local poll=""
  for _ in $(seq 1 90); do
    poll="$(curl -sf "$BASE/api/analyze?id=$analysis_id&userId=$user_id" || true)"
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
  printf '%s\n' "$poll"
}

health="$(curl -sf "$BASE/api/health" || true)"
if [ -z "$health" ]; then
  echo "[user-links] сервер не отвечает на $BASE — запусти pnpm dev" >&2
  exit 1
fi
echo "$health" | jq -c '{ok,version,honesty}'
needs="$(echo "$health" | jq -r '.honesty.needsUserReels')"
if [ "$needs" != "true" ]; then
  echo "FAIL: health.needsUserReels=$needs, ждали true" >&2
  exit 1
fi

IG_LINKS="$(cat <<'EOF'
https://instagram.com/reel/UserLinkOne  торт без сахара, 12 тыс просмотров, 41% удержание
https://instagram.com/reel/UserLinkTwo  разлом зефира, 8 тыс
https://instagram.com/reel/UserLinkThree  фисташка и малина
EOF
)"

YT_LINKS="$(cat <<'EOF'
https://youtube.com/shorts/UserYtOne  колодец под ключ, 9 тыс просмотров, 44% удержание
https://youtube.com/watch?v=UserYtTwo  кессон и обсадка, 6 тыс
https://youtu.be/UserYtThree  септик на участке
EOF
)"

# --- Instagram: 3 URL + Insights ---
USER_ID="$(make_user "user_links_ig")"
log "IG пользователь $USER_ID"

onboard="$(curl -sS -o /tmp/ul-onboard.json -w "%{http_code}" -X POST "$BASE/api/users/onboard" \
  -H 'content-type: application/json' \
  -d "$(jq -nc --arg userId "$USER_ID" --arg links "$IG_LINKS" '{
    userId: $userId,
    socialHandle: "@pastry.demo",
    profileGoal: "GROW_AUDIENCE",
    toneOfVoice: "DIRECT",
    nichePreset: "food",
    submittedReelsText: $links
  }')")"
echo "onboard IG HTTP $onboard $(jq -c '{handle: .user.socialHandle, error, code}' /tmp/ul-onboard.json)"
[ "$onboard" = "200" ] || exit 1

log "IG анализ"
analyze="$(curl -sS -o /tmp/ul-analyze.json -w "%{http_code}" -X POST "$BASE/api/analyze" \
  -H 'content-type: application/json' \
  -d "$(jq -nc --arg userId "$USER_ID" '{userId: $userId}')")"
echo "analyze IG HTTP $analyze $(jq -c '{id: .analysis.id, error, code}' /tmp/ul-analyze.json)"
ANALYSIS_ID="$(jq -r '.analysis.id // .id' /tmp/ul-analyze.json)"
[ -n "$ANALYSIS_ID" ] && [ "$ANALYSIS_ID" != "null" ] || exit 1
result="$(poll_analysis "$ANALYSIS_ID" "$USER_ID")"

src="$(echo "$result" | jq -r '.analysis.profileSource')"
videos="$(echo "$result" | jq -r '.analysis.sourceVideos | length')"
script="$(echo "$result" | jq -r '.analysis.scripts[0].teleprompterScript // empty')"
views0="$(echo "$result" | jq -r '.analysis.sourceVideos[0].views // 0')"
ret0="$(echo "$result" | jq -r '.analysis.sourceVideos[0].retentionPct // 0')"
tips="$(echo "$result" | jq -r '.analysis.profileAuditTips // [] | join(" | ")')"

echo "$result" | jq -c '{
  profileSource: .analysis.profileSource,
  aiMocked: .analysis.aiMocked,
  videos: [.analysis.sourceVideos[] | {url, views, retentionPct, caption}],
  title: .analysis.scripts[0].title,
  hasTeleprompter: ((.analysis.scripts[0].teleprompterScript // "") | length > 20)
}'

if [ "$src" != "user" ]; then
  echo "FAIL: IG profileSource=$src, ждали user" >&2
  exit 1
fi
if [ "$videos" -lt 3 ]; then
  echo "FAIL: IG мало sourceVideos" >&2
  exit 1
fi
if [ "${#script}" -lt 20 ]; then
  echo "FAIL: IG нет суфлёра" >&2
  exit 1
fi
if [ "$views0" != "12000" ]; then
  echo "FAIL: IG views первого ролика $views0" >&2
  exit 1
fi
assert_no_opened_account "$script $tips"

# --- YouTube канал без ссылок: честный 400 ---
YT_BARE="$(make_user "user_links_yt_bare")"
log "YouTube без ссылок, пользователь $YT_BARE"
yt400="$(curl -sS -o /tmp/ul-yt400.json -w "%{http_code}" -X POST "$BASE/api/users/onboard" \
  -H 'content-type: application/json' \
  -d "$(jq -nc --arg userId "$YT_BARE" '{
    userId: $userId,
    socialHandle: "@kolodets",
    profileGoal: "GROW_AUDIENCE",
    toneOfVoice: "DIRECT",
    nichePreset: "custom"
  }')")"
echo "onboard YT bare HTTP $yt400 $(jq -c '{error, code}' /tmp/ul-yt400.json)"
if [ "$yt400" != "400" ]; then
  echo "FAIL: @kolodets без ссылок должен быть 400, получили $yt400" >&2
  exit 1
fi
yt_code="$(jq -r '.code // empty' /tmp/ul-yt400.json)"
if [ "$yt_code" != "YOUTUBE" ]; then
  echo "FAIL: ждали code=YOUTUBE, получили $yt_code" >&2
  exit 1
fi
if ! jq -r '.error' /tmp/ul-yt400.json | grep -q 'YouTube-канал не разбираем'; then
  echo "FAIL: текст 400 не про канал" >&2
  exit 1
fi

# --- YouTube: 3 URL видео/Shorts + подпись ---
YT_USER="$(make_user "user_links_yt")"
log "YouTube user-links, пользователь $YT_USER"
yt_onboard="$(curl -sS -o /tmp/ul-yt-onboard.json -w "%{http_code}" -X POST "$BASE/api/users/onboard" \
  -H 'content-type: application/json' \
  -d "$(jq -nc --arg userId "$YT_USER" --arg links "$YT_LINKS" '{
    userId: $userId,
    socialHandle: "@kolodets",
    profileGoal: "GROW_AUDIENCE",
    toneOfVoice: "DIRECT",
    nichePreset: "custom",
    offerSummary: "колодец и кессон под ключ",
    submittedReelsText: $links
  }')")"
echo "onboard YT HTTP $yt_onboard $(jq -c '{handle: .user.socialHandle, error, code}' /tmp/ul-yt-onboard.json)"
[ "$yt_onboard" = "200" ] || exit 1

log "YouTube анализ"
yt_analyze="$(curl -sS -o /tmp/ul-yt-analyze.json -w "%{http_code}" -X POST "$BASE/api/analyze" \
  -H 'content-type: application/json' \
  -d "$(jq -nc --arg userId "$YT_USER" '{userId: $userId}')")"
echo "analyze YT HTTP $yt_analyze $(jq -c '{id: .analysis.id, error, code}' /tmp/ul-yt-analyze.json)"
YT_ID="$(jq -r '.analysis.id // .id' /tmp/ul-yt-analyze.json)"
[ -n "$YT_ID" ] && [ "$YT_ID" != "null" ] || exit 1
yt_result="$(poll_analysis "$YT_ID" "$YT_USER")"

yt_src="$(echo "$yt_result" | jq -r '.analysis.profileSource')"
yt_videos="$(echo "$yt_result" | jq -r '.analysis.sourceVideos | length')"
yt_script="$(echo "$yt_result" | jq -r '.analysis.scripts[0].teleprompterScript // empty')"
yt_views0="$(echo "$yt_result" | jq -r '.analysis.sourceVideos[0].views // 0')"
yt_tips="$(echo "$yt_result" | jq -r '.analysis.profileAuditTips // [] | join(" | ")')"
yt_blob="$(echo "$yt_result" | jq -r '[.analysis.niche, .analysis.targetAudience, (.analysis.profileAuditTips // [] | join(" ")), (.analysis.scripts[0].teleprompterScript // "")] | join(" ")')"

echo "$yt_result" | jq -c '{
  profileSource: .analysis.profileSource,
  aiMocked: .analysis.aiMocked,
  videos: [.analysis.sourceVideos[] | {url, views, retentionPct, caption}],
  title: .analysis.scripts[0].title,
  niche: .analysis.niche,
  hasTeleprompter: ((.analysis.scripts[0].teleprompterScript // "") | length > 20)
}'

if [ "$yt_src" != "user" ]; then
  echo "FAIL: YT profileSource=$yt_src, ждали user" >&2
  exit 1
fi
if [ "$yt_videos" -lt 3 ]; then
  echo "FAIL: YT мало sourceVideos" >&2
  exit 1
fi
if [ "${#yt_script}" -lt 20 ]; then
  echo "FAIL: YT нет суфлёра" >&2
  exit 1
fi
if [ "$yt_views0" != "9000" ]; then
  echo "FAIL: YT views первого ролика $yt_views0" >&2
  exit 1
fi
if echo "$yt_blob" | grep -Eiq 'лайфстайл|фитнес огонь|типичный фитнес'; then
  echo "FAIL: YT звучит как фейковая Reels-стратегия" >&2
  exit 1
fi
assert_no_opened_account "$yt_script $yt_tips $yt_blob"

{
  echo "# User-links cycle (не live scrape, Apify не вызывали)"
  echo
  echo "## Instagram @pastry.demo + 3 URL"
  echo
  echo "- profileSource: **$src**"
  echo "- роликов: **$videos**"
  echo "- просмотры / удержание первого: **$views0** / **$ret0%**"
  echo "- сценариев: $(echo "$result" | jq '.analysis.scripts | length')"
  echo "- aiMocked: $(echo "$result" | jq -r '.analysis.aiMocked')"
  echo
  echo "### Суфлёр"
  echo
  echo '```'
  echo "$script"
  echo '```'
  echo
  echo "## YouTube @kolodets без ссылок"
  echo
  echo "- HTTP **400** code=YOUTUBE"
  echo
  echo "## YouTube @kolodets + 3 URL видео/Shorts"
  echo
  echo "- profileSource: **$yt_src**"
  echo "- роликов: **$yt_videos**"
  echo "- просмотры первого: **$yt_views0**"
  echo "- aiMocked: $(echo "$yt_result" | jq -r '.analysis.aiMocked')"
  echo "- ниша: $(echo "$yt_result" | jq -r '.analysis.niche')"
  echo
  echo "### Суфлёр"
  echo
  echo '```'
  echo "$yt_script"
  echo '```'
} > "$OUT"

echo
echo "OK user-links (IG + YT 400 + YT pasted). Отчёт: $OUT"
