---
title: Схема репо
nav_exclude: true
---

# Схема репозиторію

Цей файл фіксує конвенції про `id`, frontmatter і структуру каталогів.
Усе нижче — *договір* між авторами PR і ревьюерами; лінтер (TODO) ці правила
буде валідувати автоматично.

## Стабільні `id`

Кожен файл, що відповідає одиниці НПА (наказу, його пункту, главі, додатку),
МУСИТЬ мати в frontmatter поле `id`. `id` — стабільний на віки. Якщо
пункт скасовано — його файл залишається з `status: repealed`, `id` не
переприсвоюється.

### Грамматика id

```
id            ::= scope ('.' segment)+
scope         ::= 'nakaz' | 'polozhennia' | 'dodatok' '.' <N>
segment       ::= 'r' <N>          # розділ
                | 'gl' <N>         # глава
                | 'p' <N> ('.' <N>)*  # пункт (1.2.3.4 ...)
                | 'stattia' '.' <N>   # стаття (для Розкладу хвороб)
                | 'pp' '.' <letter>   # підпункт (а, б, в ...)
```

### Приклади

| id                              | Що означає                                  |
| ------------------------------- | ------------------------------------------- |
| `nakaz`                         | сам наказ № 402                             |
| `nakaz.p3`                      | пункт 3 наказу                              |
| `polozhennia.r1`                | Розділ I Положення                          |
| `polozhennia.r1.gl1`            | Глава 1 Розділу I                           |
| `polozhennia.r1.gl1.p1.1`       | пункт 1.1                                   |
| `polozhennia.r1.gl1.p1.1.a`     | підпункт «а» пункту 1.1                     |
| `dodatok.1`                     | Додаток 1 (Розклад хвороб) як ціле          |
| `dodatok.1.stattia.42`          | Стаття 42 Розкладу хвороб                   |
| `dodatok.1.stattia.42.pp.b`     | Підпункт «б» статті 42                      |

## Frontmatter: обов'язкові поля

```yaml
---
id: <за грамматикою вище>
type: nakaz | rozdil | glava | punkt | dodatok | stattia
parent: <id батьківського вузла, окрім nakaz і dodatok.N>
title: "Коротка назва"
source: <посилання на анкер в офіційному тексті на rada.gov.ua>
status: active | repealed | suspended
---
```

## Frontmatter: рекомендовані поля

```yaml
original_redaction: 2008-08-14   # коли пункт вперше з'явився
last_amended:                    # останній амендмент, що зачепив пункт
  date: 2025-08-01
  order: z1167-25
amended_by:                      # повна історія амендментів цього пункту
  - { date: 2023-08-18, order: z1467-23, op: edit, scope: "абзац 2" }
  - { date: 2024-04-27, order: z0616-24, op: redaction }
  - { date: 2025-08-01, order: z1167-25, op: edit }
```

### Операції в `amended_by` / `affects`

| `op`        | Що це                                                           |
| ----------- | --------------------------------------------------------------- |
| `insert`    | пункт/абзац вперше додано                                       |
| `edit`      | дрібна правка (слово, дата, посилання)                          |
| `redaction` | повністю нова редакція пункту                                   |
| `repeal`    | втратив чинність                                                |
| `restore`   | відновлено після скасування (рідко, але теоретично можливо)     |

## Структура каталогів

```
.
├── nakaz.md                  type=nakaz                  id=nakaz
├── polozhennia/
│   ├── README.md             ↳ зміст Положення
│   ├── 01-osnovy-organizatsii/        type=rozdil    id=polozhennia.r1
│   │   ├── README.md         ↳ зміст розділу
│   │   ├── 01-zagalni-polozhennia.md  type=glava     id=polozhennia.r1.gl1
│   │   ├── 02-organy-vle.md           type=glava     id=polozhennia.r1.gl2
│   │   └── 03-rozhliad-zvernen.md     type=glava     id=polozhennia.r1.gl3
│   └── 02-medychnyi-oglyad/           type=rozdil    id=polozhennia.r2
└── dodatky/
    ├── README.md
    ├── 01-rozklad-khvorob/            type=dodatok   id=dodatok.1
    │   ├── README.md
    │   ├── meta.yaml                  ↳ схема статті, графи, категорії
    │   └── stattia-001.yaml           type=stattia   id=dodatok.1.stattia.1
    ├── 02-poyasnennia.md              type=dodatok   id=dodatok.2
    ├── 03-tdv.md                      type=dodatok   id=dodatok.3
    ├── 04-dovidka-inozemets.md        type=dodatok   id=dodatok.4
    └── 05-dovidka-travma.md           type=dodatok   id=dodatok.5
```

**Іменування файлів:** ASCII latin only (для крос-платформенності), kebab-case,
з префіксом-номером для природного сортування (`01-`, `02-`). Транслітерація —
ДСТУ 9112:2021 (спрощено).

## Чому «конфіги в додатках»?

Уявімо, що Розклад хвороб (Додаток 1) — це таблиця, а не суцільний текст.
Тоді:

- зміна порогу за однією статтею = правка одного рядка в `stattia-042.yaml`;
- лінтер може перевіряти, що для кожної статті заповнені всі графи;
- з даних можна автоматично згенерувати:
  - HTML-сторінку статті;
  - PDF-витяг;
  - калькулятор «який висновок отримає особа з діагнозом X».

Це і є мета винесення «конфігів» у додатки: НПА читає `dodatky/01-rozklad-khvorob/`
як БД, а не як суцільний документ.
