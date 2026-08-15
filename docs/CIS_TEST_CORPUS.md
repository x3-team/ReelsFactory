# CIS test corpus

16 публичных хендлов от владельца (15.08.2026). Новых `@` не выдумывали.
Пустой Instagram в корпус не клали.

Это список для прогона. Без ключа скрейпа **ни один аккаунт не разобран**.
Живой скрейп без `AITUNNEL_API_KEY` собирает сценарии из подписей
(local-shell) — не демо 48k.

## Первая пачка (15.08.2026, эта VM)

`APIFY_TOKEN` present, non-empty, prefix=other, length=46. `AITUNNEL_API_KEY`
absent. `RAPIDAPI_KEY` absent. Мок не подставляли.

| Хендл | Площадка | Результат |
| --- | --- | --- |
| `@karinakross` | Instagram | live, 16 роликов, 3 сценария из подписей |
| `@agre_daria_fit` | Instagram | live, 16 роликов, 3 сценария из подписей |
| `@ksenia_makarchuk__` | Instagram | live, 16 роликов, 3 сценария из подписей |
| `@homm9k` | TikTok | live, 16 роликов; топ по просмотрам часто без текста — сценарии из пула подписей |
| `@kolodets` | YouTube | HTTP 400 `YOUTUBE`, `real-run` exit 3 |
| `@investfutureru` | YouTube | HTTP 400 `YOUTUBE`, `real-run` exit 3 |

`@hommm9k` (три m) не подставляли вместо TikTok.
Цифры роста не утверждаем — только то, что вернул Apify.

## Живой LLM (15.08.2026, новая VM)

`APIFY_TOKEN` present, non-empty, prefix=`apify_api_`, length=46.
`AITUNNEL_API_KEY` present, non-empty, prefix=`sk-`, length=44.
`RAPIDAPI_KEY` absent. Мок не подставляли. Тихий `local-shell` выключен.

Новый Apify run — **403 Monthly usage hard limit**. Движок взял SUCCEEDED-датасет
того же хендла (оплаченный прогон ~20:09–20:13) и прогнал `POST /api/analyze`.
Модель стратегии: **`gpt-5.6-luna`** (Start). Whisper: `whisper-1`.

| Хендл | Площадка | Модель | Результат | Сценарии про этот аккаунт? |
| --- | --- | --- | --- | --- |
| `@karinakross` | Instagram | `gpt-5.6-luna` | live, `apify-reuse`, 0 транскриптов | да: лето / приложение / дети 90-х, не фитнес |
| `@agre_daria_fit` | Instagram | `gpt-5.6-luna` | live, `apify-reuse`, 0 транскриптов | да: ягодицы / резинка / тренер 35+ |
| `@ksenia_makarchuk__` | Instagram | `gpt-5.6-luna` | live, `apify-reuse`, 3 транскрипта | да: новостройки СПб / ипотека, не фитнес |
| `@homm9k` | TikTok | `gpt-5.6-luna` | live, `apify-reuse`, 0 транскриптов | да: Батуми / тревел HOMA, не фитнес |
| `@kolodets` | YouTube | — | HTTP 400 `YOUTUBE` | отказ, не Reels |
| `@investfutureru` | YouTube | — | HTTP 400 `YOUTUBE` | отказ, не Reels |

Рост не обещаем. CTA-слово часто общее (`ГАЙД` / `УРОК`) — это не ниша.

## Вторая пачка (15.08.2026, та же VM)

`AITUNNEL_API_KEY` по-прежнему absent → **HARD_STOP_NO_AITUNNEL**: первую
четвёрку IG/TT не перегоняли живой LLM и не мокали. Скрейп Apify живой.

| Хендл | Площадка | Результат |
| --- | --- | --- |
| `@victoriabonya` | Instagram | live, 16 роликов, 3 сценария из подписей |
| `@goar_avetisyan` | Instagram | live, 16 роликов, 3 сценария из подписей |
| `@prodasha_live` | Instagram | live, 16 роликов, 3 сценария из подписей |
| `@krava_nakormit` | TikTok | live, 16 роликов, 3 сценария из подписей |
| `@eugenius_official` | TikTok | live, 16 роликов, 3 сценария из подписей |
| `@botagozomarova2` | TikTok | live, 16 роликов, 3 сценария из подписей |
| `@tanyatgym` | не указана | HTTP 400 `CORPUS_PLATFORM_UNKNOWN`, guard exit 4 |
| `@oskarhartmann1` | YouTube | HTTP 400 `YOUTUBE`; IG-алиас `@oskar_hartmann` не подставляли |
| `@linguamarina` | YouTube | HTTP 400 `YOUTUBE` |
| `@a4a4a4a4` | YouTube | HTTP 400 `YOUTUBE`; `@a4omg` не угадывали |

## Как гонять

```bash
pnpm test:corpus                          # матрица + HARD STOP без ключа
PLAN=PRO bash scripts/real-run.sh @handle # один аккаунт; корпус без ключа = exit 2/3/4
```

Первая пачка (не все 16 сразу): `@karinakross` `@agre_daria_fit`
`@ksenia_makarchuk__` `@kolodets` `@homm9k` `@investfutureru`.

## Что умеем live, а что нет

| Хендл | Площадка | Live без ключа | С ключом |
| --- | --- | --- | --- |
| `@karinakross` | IG юмор | нет | IG, если Apify/Rapid |
| `@victoriabonya` | IG лайфстайл | нет | IG |
| `@goar_avetisyan` | IG визаж | нет | IG |
| `@krava_nakormit` | TikTok еда | нет | только Apify |
| `@prodasha_live` | IG еда | нет | IG |
| `@linguamarina` | YouTube | отказ 400 | отказ 400 |
| `@homm9k` | TikTok | нет | только Apify |
| `@hommm9k` | IG (три m) | нет | IG |
| `@a4a4a4a4` | YouTube | отказ 400 | отказ 400 |
| `@a4omg` | IG и TT | не угадываем | нужен URL |
| `@tanyatgym` | не указана | не угадываем IG | нужен URL |
| `@agre_daria_fit` | IG фитнес | нет | IG |
| `@oskarhartmann1` | YouTube | отказ 400 | отказ 400 |
| `@oskar_hartmann` | IG | нет | IG |
| `@ksenia_makarchuk__` | IG финансы СПб | нет | IG |
| `@eugenius_official` | TikTok математика | нет | только Apify |
| `@botagozomarova2` | TikTok, Достык | нет | только Apify |
| `@kolodets` | YouTube колодцы МО | отказ 400 | отказ 400 — не «лайфстайл огонь» |
| `@investfutureru` | YouTube аналитика | отказ 400 | отказ 400 — не «стратегия огонь для Reels» |

## Враньё, которое закрыли

До фикса `@kolodets` и `@investfutureru` детектились как Instagram и в демо
получали мок на 48k подписчиков. Это и есть ложь «стратегия огонь».
Сейчас YouTube всегда 400; корпусный хендл без скрейпа — 503, не мок.
