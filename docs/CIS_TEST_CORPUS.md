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

Остальные 10 из 16 не гоняли. `@hommm9k` (три m) не подставляли вместо TikTok.
Цифры роста не утверждаем — только то, что вернул Apify.

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
