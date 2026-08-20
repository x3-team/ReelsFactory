# CIS test corpus

16 публичных хендлов от владельца (15.08.2026) + `@desertmsk` из `AGENTS.md`.
Новых `@` не выдумывали. YouTube и хендлы без площадки в live-скрейп не кладём.

Источник списка: ветка `cursor/cis-content-bomb-features-fc8c` (PR #6, не мержили).
Код: `src/lib/test-corpus.ts`.

| Хендл | Площадка | Live scrape |
| --- | --- | --- |
| `@karinakross` | Instagram | да |
| `@victoriabonya` | Instagram | да |
| `@goar_avetisyan` | Instagram | да |
| `@krava_nakormit` | TikTok | да |
| `@prodasha_live` | Instagram | да |
| `@linguamarina` | YouTube | нет, отказ |
| `@homm9k` | TikTok | да |
| `@a4a4a4a4` | YouTube | нет, отказ |
| `@tanyatgym` | не указана | нет, отказ |
| `@agre_daria_fit` | Instagram | да |
| `@oskarhartmann1` | YouTube | нет, отказ |
| `@ksenia_makarchuk__` | Instagram | да |
| `@eugenius_official` | TikTok | да |
| `@botagozomarova2` | TikTok | да |
| `@kolodets` | YouTube | нет, отказ |
| `@investfutureru` | YouTube | нет, отказ |
| `@desertmsk` | Instagram | да (AGENTS.md) |

Алиасы не подставляем сами: `@hommm9k` (IG, три m), `@oskar_hartmann`, `@a4omg`.

## Как гонять после поднятия квоты Apify

```bash
# короткий ping (без печати токена)
pnpm scrape:resume -- --ping-only

# разумная пачка (не ночная волна)
pnpm scrape:resume
```

Прогон 16.08.2026: `docs/APIFY_RESUME_2026-08-16.md`.
Прогон 20.08.2026: `docs/APIFY_RESUME_2026-08-20.md`.
