# Шрифты

| Файл | Семейство | Лицензия | Где используется |
| --- | --- | --- | --- |
| `Onest-latin-cyrillic.woff2` | Onest Variable (300–800) | SIL OFL 1.1 | основной текст всего продукта |
| `Unbounded-latin-cyrillic.woff2` | Unbounded Variable (500–800) | SIL OFL 1.1 | дисплейные заголовки лендинга |
| `GeistVF.woff` | Geist Variable | SIL OFL 1.1 | запасной шрифт |
| `GeistMonoVF.woff` | Geist Mono Variable | SIL OFL 1.1 | не подключён |

Onest и Unbounded — сабсеты латиницы и кириллицы (`pyftsubset`, диапазоны `U+0020–007E`,
`U+0400–045F`, `U+0490–0491` плюс типографская пунктуация, `₽`, `№`). Полные файлы —
[google/fonts](https://github.com/google/fonts): `ofl/onest`, `ofl/unbounded`.

Файлы лежат в репозитории, чтобы сборка не ходила в сеть за шрифтами.
