---
title: JSON API
nav_order: 7
permalink: /api-docs/
---

# JSON API

Статичний API над репозиторієм. Без бекенду — все це звичайні `.json`-файли,
що віддаються GitHub Pages з CDN і кешем. Версія == git commit.

## Endpoint'и

| URL | Опис |
| --- | --- |
| [`/api/index.json`](/nakaz-402/api/index.json) | Манифест: повний перелік endpoint'ів |
| [`/api/amendments.json`](/nakaz-402/api/amendments.json) | Журнал амендментів |
| [`/api/dodatok-1/index.json`](/nakaz-402/api/dodatok-1/index.json) | Розклад хвороб — індекс статей + словник категорій і граф |
| [`/api/dodatok-1/stattia-001.json`](/nakaz-402/api/dodatok-1/stattia-001.json) | Стаття 1 (Туберкульоз) |
| [`/api/dodatok-1/stattia-014.json`](/nakaz-402/api/dodatok-1/stattia-014.json) | Стаття 14 (Реактивні психози) |
| [`/api/dodatok-1/stattia-042.json`](/nakaz-402/api/dodatok-1/stattia-042.json) | Стаття 42 (Артеріальна гіпертензія) |

## Приклади

### Чи був амендмент у 2024 році, що зачепив пункт 1.2 Розділу I?

```bash
curl -s https://workflowcat.github.io/nakaz-402/api/amendments.json | \
  jq '.amendments[] | select(.signed_at | startswith("2024")) |
      select(.affects[]?.id == "polozhennia.r1.gl1.p1.2")'
```

### Який висновок ВЛК у статті 42 (АТ), підпункт «в», графа III?

```bash
curl -s https://workflowcat.github.io/nakaz-402/api/dodatok-1/stattia-042.json | \
  jq '.punkty[] | select(.id == "в") | .grafy.III'
# → "Б-3"
```

### Перелічити всі статті Розкладу хвороб класу I00–I99 (кровообіг)

```bash
curl -s https://workflowcat.github.io/nakaz-402/api/dodatok-1/index.json | \
  jq '.statti[] | select(.klas == "I00-I99")'
```

### JavaScript у браузері

```js
const data = await fetch('/nakaz-402/api/amendments.json').then(r => r.json());
const recent = data.amendments.filter(a => a.signed_at.startsWith('2025'));
console.log(`${recent.length} амендментів у 2025-му`);
```

## Як це генерується

```bash
python3 scripts/build_api.py
# або
make api
```

Skript читає `meta/amendments.yaml` і `dodatky/01-rozklad-khvorob/*.yaml`,
конвертує дати в ISO-формат, додає метадані (`schema_version`, `generated_at`,
`source`), і пише `.json` файли в `api/`.

JSON-and-data файли в `api/` фіксуються в git — отже, `https://workflowcat.github.io/nakaz-402/api/amendments.json`
просто файл, який GitHub Pages віддає швидко й кешує. Бекенду немає, downtime нема.
