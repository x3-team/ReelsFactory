# Apify resume — 16.08.2026

Квота поднята. Прогон на ветке `cursor/apify-quota-resume-8ec0` (PR отдельный, не #6).
Новых `@` не выдумывали: корпус из `docs/CIS_TEST_CORPUS.md` + `@desertmsk` из `AGENTS.md`.

## Ping

`APIFY_TOKEN` present, prefix=`apify_api_`, length=46. `GET /v2/users/me` → 200.
Аккаунт `Soprano777`, план STARTER, цикл с 16.08.2026 00:00 UTC.

| Момент | usage USD | cap | остаток |
| --- | --- | --- | --- |
| до пачки | 0.0005 | 29 | ≈ 28.999 |
| после 5 live-run | 0.0338 | 29 | ≈ 28.966 |

Hard limit 403 **не** повторился.

## Снято

| Хендл | Площадка | Followers | Ролики | audioUrl | Whisper live | Сценарии luna | scrapeMode |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `@ksenia_makarchuk__` | IG | 8 804 | 8 | 8 | 2 | 3 | live-run |
| `@agre_daria_fit` | IG | 164 045 | 4 | 4 | 1 | 3 | live-run |
| `@prodasha_live` | IG | 1 645 449 | 8 | 8 | 0 | 3 | live-run |
| `@eugenius_official` | TikTok | 94 800 | 8 | 0 | 0 | 3 | live-run |
| `@desertmsk` | IG | 29 236 | 8 | 8 | 0 | 3 | live-run |

Итого: **5 профилей, 36 роликов, 15 сценариев** на `gpt-5.6-luna`, `mocked=false`.
Ниши живые: СПб-новостройки, домашний фитнес 35+, столовая/заготовки, математика ЕНТ, зефир `desertmsk`. Не демо 48k.

Whisper бюджет умышленно маленький (3 live) — не ночная волна. Остальные сценарии из подписей + био.

## Ещё красное

- YouTube (`@kolodets`, `@investfutureru`, `@linguamarina`, `@oskarhartmann1`, `@a4a4a4a4`) — отказ, скрейпа нет
- `@tanyatgym` — площадка не указана, не угадываем IG
- TikTok `audioUrl` пустой у `clockworks/tiktok-profile-scraper` → Whisper 0 (сценарии из подписей)
- В этой VM нет Postgres — полный HTTP-цикл `/api/analyze` не поднимали, прогон через `pnpm scrape:resume`
- PR #6 по-прежнему не мержили
- RapidAPI нет; прод не деплоили
