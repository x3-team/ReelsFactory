#!/usr/bin/env bash
# Полный прогон анализа на реальном аккаунте против локального сервера.
#
#   bash scripts/real-run.sh @desertmsk            # тариф FREE (1 сценарий)
#   PLAN=PRO bash scripts/real-run.sh @desertmsk   # тариф PRO (полный пакет)
#
# Что делает: создаёт тестового пользователя, проходит онбординг, запускает
# анализ, ждёт результат и печатает сценарии в читаемом виде.
#
# Реальные данные вместо моков включаются ключами в .env:
#   APIFY_TOKEN       — скрейп Instagram/TikTok
#   AITUNNEL_API_KEY  — Whisper + LLM
# Без скрейпа скрипт останавливается: живая модель + демо-профиль = ложь.
# Скрейп без AI — сценарии из подписей (local-shell), не демо 48k.
# Демо-прогон только явно: ALLOW_MOCK_PROFILE=true (AI тоже останется демо).
set -euo pipefail

cd "$(dirname "$0")/.."

HANDLE="${1:-}"
if [ -z "$HANDLE" ]; then
  echo "Использование: bash scripts/real-run.sh @handle" >&2
  exit 1
fi

BASE="${BASE:-http://localhost:3000}"
PLAN="${PLAN:-FREE}"
GOAL="${GOAL:-GROW_AUDIENCE}"
TONE="${TONE:-DIRECT}"
NICHE="${NICHE:-}"
OFFER="${OFFER:-}"
TG_ID="${TG_ID:-$RANDOM$RANDOM}"
OUT="${OUT:-/tmp/real-run-$(date +%Y%m%d-%H%M%S).md}"

log() { printf '\n[real-run] %s\n' "$*"; }

# Prisma URLs often include ?schema=public — psql rejects that query param.
psql_db() {
  local url="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/reelsfactory}"
  printf '%s\n' "${url%%\?*}"
}

log "сервер: $BASE · аккаунт: $HANDLE · тариф: $PLAN · telegramId: $TG_ID"

# Ключ может прийти двумя путями: переменной окружения (секреты Cursor) или из .env.
has_key() {
  local name="$1"
  [ -n "${!name:-}" ] && return 0
  grep -qE "^${name}=.+" .env 2>/dev/null
}

# Без ключа скрейпинга профиль берётся из демо-данных. Если при этом есть ключ AI,
# модель отработает по-настоящему — и отчёт будет выглядеть настоящим, хотя факты
# в нём выдуманы. Предупреждаем громко, чтобы такой прогон не приняли за живой.
# Публичный корпус (karinakross, kolodets, …) нельзя закрывать демо-профилем.
# Даже ALLOW_MOCK_PROFILE=true здесь — враньё: «разобрали живой аккаунт».
if node --experimental-strip-types scripts/corpus-guard.ts "$HANDLE"; then
  :
else
  guard_rc=$?
  if [ "$guard_rc" -eq 2 ] || [ "$guard_rc" -eq 3 ] || [ "$guard_rc" -eq 4 ]; then
    echo "  Прогон остановлен (corpus-guard exit $guard_rc)." >&2
    exit "$guard_rc"
  fi
  echo "  corpus-guard упал с кодом $guard_rc" >&2
  exit 1
fi

if ! has_key APIFY_TOKEN && ! has_key RAPIDAPI_KEY; then
  cat >&2 <<'WARN'

  ВНИМАНИЕ: в .env нет ни APIFY_TOKEN, ни RAPIDAPI_KEY.
  Живой разбор этого аккаунта невозможен. Без явного ALLOW_MOCK_PROFILE
  сервер тоже откажется — иначе получится уверенный текст про выдуманный профиль.

WARN
  if [ "${ALLOW_MOCK_PROFILE:-}" != "true" ]; then
    echo "  Прогон остановлен. Для демо-прогона: ALLOW_MOCK_PROFILE=true" >&2
    exit 2
  fi
fi

health="$(curl -sf "$BASE/api/health" || true)"
if [ -z "$health" ]; then
  echo "[real-run] сервер не отвечает на $BASE — запусти pnpm dev" >&2
  exit 1
fi
echo "$health" | jq -c '{ok,version,honesty}'

honesty_mode="$(echo "$health" | jq -r '.honesty.mode // "unknown"')"
if [ "$honesty_mode" = "blocked" ]; then
  echo "$health" | jq -r '.honesty.warning // "живой разбор заблокирован"' >&2
  exit 2
fi

user_json="$(curl -sf -X POST "$BASE/api/users" \
  -H 'content-type: application/json' \
  -d "$(jq -nc --arg id "$TG_ID" '{telegramId: $id, username: "real_run", firstName: "Real", languageCode: "ru"}')")"
USER_ID="$(echo "$user_json" | jq -r '.user.id')"
[ -n "$USER_ID" ] && [ "$USER_ID" != "null" ] || { echo "не создался пользователь: $user_json" >&2; exit 1; }
log "пользователь: $USER_ID"

if [ "$PLAN" != "FREE" ]; then
  psql "$(psql_db)" -qc \
    "UPDATE \"User\" SET \"subscriptionPlan\" = '$PLAN', \"subscriptionExpiresAt\" = now() + interval '30 days' WHERE id = '$USER_ID';"
  log "тариф выставлен: $PLAN"
fi

onboard_payload="$(jq -nc \
  --arg userId "$USER_ID" \
  --arg handle "$HANDLE" \
  --arg goal "$GOAL" \
  --arg tone "$TONE" \
  --arg niche "$NICHE" \
  --arg offer "$OFFER" \
  '{userId: $userId, socialHandle: $handle, profileGoal: $goal, toneOfVoice: $tone}
   + (if $niche == "" then {} else {nichePreset: $niche} end)
   + (if $offer == "" then {} else {offerSummary: $offer} end)')"

curl -sf -X POST "$BASE/api/users/onboard" \
  -H 'content-type: application/json' \
  -d "$onboard_payload" | jq -c '{socialHandle: .user.socialHandle, platform: .user.platform}'

log "запускаем анализ"
started="$(date +%s)"
analyze_json="$(curl -sf -X POST "$BASE/api/analyze" \
  -H 'content-type: application/json' \
  -d "$(jq -nc --arg userId "$USER_ID" '{userId: $userId}')")"
ANALYSIS_ID="$(echo "$analyze_json" | jq -r '.analysis.id // .id')"
[ -n "$ANALYSIS_ID" ] && [ "$ANALYSIS_ID" != "null" ] || { echo "анализ не запустился: $analyze_json" >&2; exit 1; }

status="QUEUED"
for _ in $(seq 1 180); do
  poll="$(curl -sf "$BASE/api/analyze?id=$ANALYSIS_ID&userId=$USER_ID" || true)"
  status="$(echo "$poll" | jq -r '.analysis.status // "UNKNOWN"')"
  printf '  %s\n' "$status"
  [ "$status" = "COMPLETED" ] && break
  if [ "$status" = "FAILED" ]; then
    echo "$poll" | jq -r '.analysis.errorMessage'
    exit 1
  fi
  sleep 3
done
elapsed=$(( $(date +%s) - started ))

if [ "$status" != "COMPLETED" ]; then
  echo "[real-run] анализ не завершился за отведённое время (статус $status)" >&2
  exit 1
fi

result="$(curl -sf "$BASE/api/analyze?id=$ANALYSIS_ID&userId=$USER_ID")"
log "готово за ${elapsed}с — отчёт: $OUT"

key_label() { has_key "$1" && echo да || echo нет; }

{
  if [ "$honesty_mode" = "live" ]; then
    echo "# Прогон на живом скрейпе: $HANDLE"
  else
    echo "# Демо-прогон (профиль не скрейпили): $HANDLE"
  fi
  echo
  echo "- тариф: **$PLAN**, время анализа: **${elapsed}с**, версия: $(echo "$health" | jq -r .version)"
  echo "- честность: **${honesty_mode}**$(echo "$health" | jq -r 'if .honesty.warning then " — \(.honesty.warning)" else "" end')"
  echo "- живой скрейп (APIFY_TOKEN / RAPIDAPI_KEY): **$(key_label APIFY_TOKEN) / $(key_label RAPIDAPI_KEY)**"
  echo "- живой AI (AITUNNEL_API_KEY): **$(key_label AITUNNEL_API_KEY)**"
  echo "- источник профиля в ответе: **$(echo "$result" | jq -r '.analysis.profileSource // "не указан"')**"
  echo "- модель стратегии: **$(echo "$result" | jq -r '.analysis.strategyModel // "не указана"')**"
  echo "- backend стратегии: **$(echo "$result" | jq -r '.analysis.strategyBackend // "не указан"')**"
  echo "- Whisper: **$(echo "$result" | jq -r '.analysis.whisperModel // "не указан"')**, живых транскриптов: **$(echo "$result" | jq -r '.analysis.spokenClipCount // 0')**"
  echo
  echo "## Какие ролики взяли"
  echo
  echo "$result" | jq -r '
    (.analysis.sourceVideos // []) as $v |
    if ($v | length) == 0 then "- (список пуст — разбор не должен считаться живым)"
    else
      $v | to_entries[] |
      "- \(.key + 1). \(.value.url) · \(.value.views // 0) просм.\(if .value.usedForSpeech then " · речь" else "" end)\(if .value.caption != "" then " — \(.value.caption)" else "" end)"
    end'
  echo
  echo "## Стратегия"
  echo
  echo "$result" | jq -r '
    .analysis as $a |
    "- ниша: \($a.niche // "—")",
    "- аудитория: \($a.targetAudience // "—")",
    "",
    "### Что починить в профиле",
    (($a.profileAuditTips // []) | to_entries[] | "\(.key + 1). \(.value)"),
    "",
    "### Столпы контента",
    (($a.contentPillars // []) | .[] |
      if type == "object" then "- **\(.title // "—")** — \(.description // "")"
      else "- \(.)" end)'
  echo
  echo "## Сценарии"
  echo
  echo "$result" | jq -r '
    .analysis.scripts[] |
    "### \(.title)",
    "",
    "- формат: \(.format) · \(.durationSec)с\(if .isTeaser then " · тизер" else "" end)",
    "- слово-CTA: \(.commentKeyword // "—")",
    (if .sourceAngle then "- угол: \(.sourceAngle)" else empty end),
    "",
    "**Хуки**",
    ((.hookOptions // []) | to_entries[] | "\(.key + 1). \(.value)"),
    "",
    (if ((.shotList // []) | length) > 0 then
      "**Раскадровка**"
     else empty end),
    (if ((.shotList // []) | length) > 0 then
      ((.shotList // []) | to_entries[] | "\(.key + 1). \(.value)")
     else empty end),
    (if ((.shotList // []) | length) > 0 then "" else empty end),
    "",
    "**Суфлёр**",
    "",
    "```",
    .teleprompterScript,
    "```",
    "",
    "**Подпись**", "", (.caption // "—"),
    "",
    "**CTA**", "", (.cta // "—"),
    ""'
  echo "## Съёмочный день"
  echo
  echo "$result" | jq -r '
    .analysis.shootDayPlan as $s |
    if $s == null then "—" else
      "**\($s.title // "План съёмки")** · ~\($s.duration_min // "?") мин · \($s.location // "локация не указана")",
      "",
      "- образ: \($s.outfit // "—")",
      "- пропы: \((($s.props // []) | join(", ")))",
      "",
      "**Порядок дублей**",
      (($s.order // []) | .[] |
        if type == "object"
        then "\(.shoot_order // "?"). \(.script_title // "—") · \(.duration_sec // "?")с — \(.note // "")"
        else "- \(.)" end),
      "",
      "**Что доснять, если осталось время**",
      (($s.extra_ideas // []) | .[] |
        if type == "object"
        then "- **\(.title // "—")** (\(.duration_sec // "?")с): «\(.hook // "")»"
        else "- \(.)" end)
    end'
} > "$OUT"

DB="$(psql_db)"
{
  echo
  echo "## Качество сигнала"
  echo
  psql "$DB" -Atc "
    SELECT
      '- роликов в скрейпе: ' || coalesce(jsonb_array_length(\"rawProfileData\"->'topVideos'), 0) || E'\n' ||
      '- подписей в пуле: ' || coalesce(jsonb_array_length(\"rawProfileData\"->'recentCaptions'), 0) || E'\n' ||
      '- живых транскриптов: ' || coalesce(jsonb_array_length(\"transcriptions\"::jsonb), 0) || E'\n' ||
      '- OCR-заметок: ' || coalesce(jsonb_array_length(\"rawProfileData\"->'visualNotes'), 0)
    FROM \"ProfileAnalysis\" WHERE id = '$ANALYSIS_ID';
  "
  echo
  echo "### Транскрипты (как ушли в модель)"
  echo
  psql "$DB" -Atc "
    SELECT coalesce(\"transcriptions\"::text, '[]')
    FROM \"ProfileAnalysis\" WHERE id = '$ANALYSIS_ID';
  "
  echo
  echo "### Слова-CTA"
  echo
  psql "$DB" -Atc "
    SELECT '- ' || coalesce(\"commentKeyword\", '—') || ' · ' || title
    FROM \"Script\" WHERE \"analysisId\" = '$ANALYSIS_ID' ORDER BY \"createdAt\";
  "
} >> "$OUT"

strategy_model="$(echo "$result" | jq -r '.analysis.strategyModel // ""')"
strategy_backend="$(echo "$result" | jq -r '.analysis.strategyBackend // ""')"
profile_source="$(echo "$result" | jq -r '.analysis.profileSource // ""')"
if has_key AITUNNEL_API_KEY; then
  if [ "$strategy_model" = "local-shell" ] || [ "$strategy_model" = "mock" ] || [ "$strategy_backend" = "local-shell" ] || [ "$strategy_backend" = "mock" ]; then
    echo "[real-run] живой AI есть, но стратегия ушла в $strategy_model / $strategy_backend — это не live LLM" >&2
    exit 5
  fi
  if [ "$profile_source" != "live" ] && [ "$profile_source" != "user" ]; then
    echo "[real-run] профиль не live/user (source=$profile_source) — не принимаем за разбор аккаунта" >&2
    exit 5
  fi
fi

echo
echo "Отчёт: $OUT"
