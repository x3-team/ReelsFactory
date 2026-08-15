#!/usr/bin/env bash
# Живые luna-сценарии по корпусным @ через вставленные URL из прошлых прогонов.
# Apify не вызывает. Новых @ не выдумывает. Нет URL — пропуск, не скрейп.
set -euo pipefail
cd "$(dirname "$0")/.."

BASE="${BASE:-http://localhost:3000}"
PLAN="${PLAN:-START}"
FIXTURE="${FIXTURE:-scripts/fixtures/corpus-user-links.json}"
OUT="${OUT:-/opt/cursor/artifacts/corpus_user_links.md}"

log() { printf '\n[corpus-user-links] %s\n' "$*"; }

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
    -d "$(jq -nc --argjson id "$tg" --arg name "$name" '{telegramId: $id, username: $name, firstName: "Corpus", languageCode: "ru"}')")"
  local id
  id="$(echo "$json" | jq -r '.user.id')"
  [ -n "$id" ] && [ "$id" != "null" ] || { echo "нет пользователя: $json" >&2; exit 1; }
  if [ "$PLAN" != "FREE" ]; then
    psql "$(psql_db)" -qc \
      "UPDATE \"User\" SET \"subscriptionPlan\" = '$PLAN', \"subscriptionExpiresAt\" = now() + interval '30 days' WHERE id = '$id';"
  fi
  printf '%s\n' "$id"
}

poll_analysis() {
  local analysis_id="$1"
  local user_id="$2"
  local out="$3"
  local status="QUEUED"
  local poll=""
  for _ in $(seq 1 90); do
    poll="$(curl -sf "$BASE/api/analyze?id=$analysis_id&userId=$user_id" || true)"
    if ! echo "$poll" | jq -e '.analysis.status' >/dev/null 2>&1; then
      printf '  poll not-json\n' >&2
      sleep 2
      continue
    fi
    status="$(echo "$poll" | jq -r '.analysis.status // "UNKNOWN"')"
    printf '  %s\n' "$status" >&2
    [ "$status" = "COMPLETED" ] && break
    if [ "$status" = "FAILED" ]; then
      echo "$poll" | jq -r '.analysis.errorMessage' >&2
      return 1
    fi
    sleep 2
  done
  [ "$status" = "COMPLETED" ] || { echo "не завершился: $status" >&2; return 1; }
  printf '%s\n' "$poll" > "$out"
}

health="$(curl -sf "$BASE/api/health" || true)"
if [ -z "$health" ]; then
  echo "сервер не отвечает на $BASE" >&2
  exit 1
fi
echo "$health" | jq -c '{ok,queue,honesty:.honesty|{mode,ai,needsUserReels,scrape}}'

passed=0
failed=0
yt400=0
skipped="$(jq -r '.skippedNoKnownUrls | length' "$FIXTURE")"

{
  echo "# Корпус user-links (без Apify)"
  echo
  echo "Источник URL: прошлые live-прогоны / ScrapeCache этой VM. Новых ссылок не выдумывали."
  echo
} > "$OUT"

n="$(jq '.handlesWithUrls | length' "$FIXTURE")"
for i in $(seq 0 $((n - 1))); do
  handle="$(jq -r ".handlesWithUrls[$i].handle" "$FIXTURE")"
  niche="$(jq -r ".handlesWithUrls[$i].nichePreset" "$FIXTURE")"
  offer="$(jq -r ".handlesWithUrls[$i].offerSummary" "$FIXTURE")"
  links="$(jq -r ".handlesWithUrls[$i].links | join(\"\\n\")" "$FIXTURE")"
  slug="$(echo "$handle" | tr -d '@' | tr '/' '_')"
  log "$handle"

  user_id="$(make_user "cul_${slug}_$RANDOM")"
  onboard="$(curl -sS -o "/tmp/cul-${slug}-onboard.json" -w "%{http_code}" -X POST "$BASE/api/users/onboard" \
    -H 'content-type: application/json' \
    -d "$(jq -nc --arg userId "$user_id" --arg handle "$handle" --arg niche "$niche" --arg offer "$offer" --arg links "$links" '{
      userId: $userId,
      socialHandle: $handle,
      profileGoal: "GROW_AUDIENCE",
      toneOfVoice: "DIRECT",
      nichePreset: $niche,
      offerSummary: $offer,
      submittedReelsText: $links
    }')")"
  echo "  onboard HTTP $onboard $(jq -c '{handle:.user.socialHandle,error,code}' "/tmp/cul-${slug}-onboard.json")"
  if [ "$onboard" != "200" ]; then
    failed=$((failed + 1))
    echo "- $handle: **FAIL onboard** $(jq -r '.error' "/tmp/cul-${slug}-onboard.json")" >> "$OUT"
    continue
  fi

  analyze="$(curl -sS -o "/tmp/cul-${slug}-analyze.json" -w "%{http_code}" -X POST "$BASE/api/analyze" \
    -H 'content-type: application/json' \
    -d "$(jq -nc --arg userId "$user_id" '{userId:$userId}')")"
  echo "  analyze HTTP $analyze $(jq -c '{id:.analysis.id,error,code}' "/tmp/cul-${slug}-analyze.json")"
  analysis_id="$(jq -r '.analysis.id // .id' "/tmp/cul-${slug}-analyze.json")"
  if [ -z "$analysis_id" ] || [ "$analysis_id" = "null" ]; then
    failed=$((failed + 1))
    echo "- $handle: **FAIL analyze**" >> "$OUT"
    continue
  fi

  if ! poll_analysis "$analysis_id" "$user_id" "/tmp/cul-${slug}-result.json"; then
    failed=$((failed + 1))
    err="$(jq -r '.analysis.errorMessage // empty' "/tmp/cul-${slug}-result.json" 2>/dev/null || true)"
    echo "- $handle: **FAIL** $err" >> "$OUT"
    continue
  fi

  result="$(cat "/tmp/cul-${slug}-result.json")"
  src="$(echo "$result" | jq -r '.analysis.profileSource')"
  videos="$(echo "$result" | jq -r '.analysis.sourceVideos | length')"
  script="$(echo "$result" | jq -r '.analysis.scripts[0].teleprompterScript // empty')"
  niche_out="$(echo "$result" | jq -r '.analysis.niche')"
  mocked="$(echo "$result" | jq -r '.analysis.aiMocked')"
  echo "$result" | jq -c '{profileSource:.analysis.profileSource,aiMocked:.analysis.aiMocked,niche:.analysis.niche,title:.analysis.scripts[0].title,videos:[.analysis.sourceVideos[]|{url,views,caption}]}'

  leak="$(echo "$result" | jq -r '[.analysis.niche, .analysis.targetAudience, (.analysis.profileAuditTips // [] | join(" ")), (.analysis.scripts[0].teleprompterScript // "")] | join(" ")')"
  if [ "$src" != "user" ] || [ "$videos" -lt 3 ] || [ "${#script}" -lt 20 ] || [ "$mocked" = "true" ]; then
    failed=$((failed + 1))
    echo "- $handle: **FAIL** source=$src videos=$videos mocked=$mocked" >> "$OUT"
    continue
  fi
  if echo "$leak" | grep -Eiq 'открыли @|открыли аккаунт|разобрали живой|лайфстайл огонь'; then
    failed=$((failed + 1))
    echo "- $handle: **FAIL** копирайт «открыли аккаунт»" >> "$OUT"
    continue
  fi

  passed=$((passed + 1))
  {
    echo "## $handle — ok"
    echo
    echo "- profileSource: **$src** · aiMocked: $mocked · роликов: $videos"
    echo "- ниша: $niche_out"
    echo "- суфлёр:"
    echo
    echo '```'
    echo "$script"
    echo '```'
    echo
  } >> "$OUT"
done

log "YouTube без роликов — 400"
yn="$(jq '.youtubeNoVideoUrls | length' "$FIXTURE")"
for ((i = 0; i < yn; i++)); do
  handle="$(jq -r ".youtubeNoVideoUrls[$i]" "$FIXTURE")"
  user_id="$(make_user "cul_yt_$RANDOM")"
  code="$(curl -sS -o /tmp/cul-yt400.json -w "%{http_code}" -X POST "$BASE/api/users/onboard" \
    -H 'content-type: application/json' \
    -d "$(jq -nc --arg userId "$user_id" --arg handle "$handle" '{
      userId: $userId,
      socialHandle: $handle,
      profileGoal: "GROW_AUDIENCE",
      toneOfVoice: "DIRECT",
      nichePreset: "custom"
    }')")"
  yt_code="$(jq -r '.code // empty' /tmp/cul-yt400.json)"
  echo "  $handle HTTP $code code=$yt_code"
  if [ "$code" = "400" ] && [ "$yt_code" = "YOUTUBE" ]; then
    yt400=$((yt400 + 1))
    echo "- $handle: **400 YOUTUBE** (нет вставленных роликов)" >> "$OUT"
  else
    failed=$((failed + 1))
    echo "- $handle: **FAIL** ждали 400 YOUTUBE, получили $code $yt_code" >> "$OUT"
  fi
done

{
  echo
  echo "## Сводка"
  echo
  echo "- прошло user-links: **$passed**"
  echo "- YouTube 400 без URL: **$yt400**"
  echo "- пропущено без известных URL: **$skipped** — $(jq -r '.skippedNoKnownUrls | join(", ")' "$FIXTURE")"
  echo "- сломалось: **$failed**"
  echo
  echo "Apify не вызывали. Мок-live нет. Новых @ нет."
} >> "$OUT"

echo
echo "passed=$passed yt400=$yt400 skipped=$skipped failed=$failed"
echo "отчёт: $OUT"
[ "$failed" = "0" ]
[ "$passed" -ge 1 ]
