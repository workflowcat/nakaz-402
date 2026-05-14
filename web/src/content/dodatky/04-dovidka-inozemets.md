---
id: dodatok.4
type: dodatok
parent_id: polozhennia
title: "Додаток 4. Довідка (іноземець)"
official_title: "Довідка ВЛК про непридатність іноземного військовослужбовця за станом здоров'я до подальшого навчання"
source: https://zakon.rada.gov.ua/laws/show/z1109-08
status: active
parent: Додатки
nav_order: 4
stub: true
---

# Додаток 4. Довідка про непридатність іноземного військовослужбовця

> 🟡 **Stub.** Це форма документа — бланк довідки, який видає ВЛК.

При наповненні рекомендую тримати в одному файлі:

1. **Машино-читабельну структуру полів** у YAML-блоці (назва поля, тип,
   обов'язковість, валідація) — щоб з цього можна було автоматично згенерувати
   форму, PDF, або інтегрувати в ІТ-систему.
2. **Зразок бланку** — як це виглядає на папері (Markdown-таблиця або
   псевдо-форма).

Тобто: і форма для людини, і схема для машини в одному файлі.

## Поля форми (TODO заповнити з офіційного зразка)

```yaml
fields:
  - { name: "datа",            type: "date",     required: true }
  - { name: "miszse",          type: "string",   required: true, label: "Місце видачі" }
  - { name: "vlk_name",        type: "string",   required: true, label: "Найменування ВЛК" }
  - { name: "person_pib",      type: "string",   required: true, label: "ПІБ" }
  # ...
```

## Джерело

[Додаток 4 на rada.gov.ua](https://zakon.rada.gov.ua/laws/show/z1109-08)
