# Apify resume — 20.08.2026

Продолжение СНГ-корпуса на ветке `cursor/cis-corpus-resume-bd80`.
PR #6 не трогали и не мержили. Новых `@` не выдумывали: только `docs/CIS_TEST_CORPUS.md`.
YouTube и `@tanyatgym` не скрейпили.
Снятое 16.08 (`@ksenia_makarchuk__`, `@agre_daria_fit`, `@prodasha_live`, `@eugenius_official`, `@desertmsk`) скипнули.

## Ping

`APIFY_TOKEN` present, prefix=`apify_api_`, length=46. `GET /v2/users/me` → 200.
Аккаунт `Soprano777`, план STARTER, цикл с 16.08.2026 00:00 UTC. LLM: `gpt-5.6-luna`.

| Момент | HTTP | usage USD | cap | остаток |
| --- | --- | --- | --- | --- |
| ping-only (до пачки) | 200 | 0.0455 | 29 | ≈ 28.95 |
| после 6 live-run | 200 | 0.1244 | 29 | ≈ 28.88 |

Расход пачки ≈ **$0.079**. Hard limit 403 **не** было. `monthlyUsage < limit`.

## Снято сейчас

| Хендл | Площадка | Followers | Ролики | audioUrl | Whisper live | Сценарии luna | scrapeMode |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `@karinakross` | IG | 10 201 478 | 8 | 8 | 3/3 | 3 | live-run |
| `@victoriabonya` | IG | 13 605 285 | 8 | 8 | 0/3 | 3 | live-run |
| `@goar_avetisyan` | IG | 12 234 718 | 8 | 8 | 3/3 | 3 | live-run |
| `@krava_nakormit` | TikTok | 1 100 000 | 8 | 8 | 1/3 | 3 | live-run |
| `@homm9k` | TikTok | 53 900 000 | 8 | 8 | 3/3 | 3 | live-run |
| `@botagozomarova2` | TikTok | 163 300 | 8 | 8 | 2/3 | 3 | live-run |

Итого сегодня: **6 профилей, 48 роликов, 18 сценариев** на `gpt-5.6-luna`, `mocked=false`.
Whisper live суммарно **12/18** (top-3 на профиль). `shouldDownloadVideos=false`.

Ниши живые: настроение/сравнение (`karinakross`), бьюти + цели (`victoriabonya`), макияж/очищение (`goar_avetisyan`), рецепты (`krava_nakormit`), лайфстайл/ивенты (`homm9k`). `@botagozomarova2` — текст на экране, сценарии слабее (много из подписей).

Whisper-пропуски: у `@victoriabonya` медиа больше лимита Whisper; у части TikTok — `400 Invalid file format` (playUrl не аудио). Сценарии тогда из подписей + био.

## Корпус целиком

Live IG+TT из списка владельца **закрыты** (5 от 16.08 + 6 от 20.08 = 11).

## Ещё красное

- YouTube (`@kolodets`, `@investfutureru`, `@linguamarina`, `@oskarhartmann1`, `@a4a4a4a4`) — отказ, скрейпа нет
- `@tanyatgym` — площадка не указана, не угадываем IG
- PR #6 по-прежнему не мержили
- RapidAPI нет; прод не деплоили
