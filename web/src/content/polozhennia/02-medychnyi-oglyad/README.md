---
id: polozhennia.r2
type: rozdil
parent_id: polozhennia
title: "Розділ II. Медичний огляд"
source: https://zakon.rada.gov.ua/laws/show/z1109-08
status: active
parent: Положення
nav_order: 2
has_children: true
---

# Розділ II. Медичний огляд
{: .no_toc }

Найбільший розділ Положення — **23 глави**, які регламентують процедури
медичного огляду для всіх категорій осіб у системі ЗСУ та суміжних формувань.

> 🚧 **Стан наповнення:** структурний скелет повний — кожна глава має ID
> і файл-стаб. Зміст пунктів наповнюється поступово через PR-флоу.
> Авторитетним джерелом залишається [текст на rada.gov.ua](https://zakon.rada.gov.ua/laws/show/z1109-08).

{% assign all_amend = site.data.amendments.amendments %}

## Глави

| № | Назва | id | Амендменти | Стан |
|---|---|---|---|---|
{%- for n in (1..23) %}
{%- assign prefix = "polozhennia.r2.gl" | append: n %}
{%- assign hits = 0 %}
{%- for a in all_amend %}
  {%- if a.affects %}
    {%- for aff in a.affects %}
      {%- if aff.id == prefix or aff.id contains prefix | append: '.' %}
        {%- assign hits = hits | plus: 1 %}
      {%- endif %}
    {%- endfor %}
  {%- endif %}
{%- endfor %}
{%- if n == 1 %}
| 1 | [Загальні положення](01-zagalni-polozhennia.md) | `polozhennia.r2.gl1` | {{ hits }} | 🟡 заглушка |
{%- elsif n == 2 %}
| 2 | [Медогляд призовників і допризовників](02-glava.md) | `polozhennia.r2.gl2` | {{ hits }} | 🟡 стаб |
{%- elsif n == 3 %}
| 3 | [Громадяни на контракт](03-glava.md) | `polozhennia.r2.gl3` | {{ hits }} | 🟡 стаб |
{%- elsif n == 4 %}
| 4 | [Кандидати у ВВНЗ і ліцеї](04-glava.md) | `polozhennia.r2.gl4` | {{ hits }} | 🟡 стаб |
{%- elsif n == 5 %}
| 5 | [Військовослужбовці](05-glava.md) | `polozhennia.r2.gl5` | {{ hits }} | 🟡 стаб |
{%- elsif n == 6 %}
| 6 | [Військовозобов'язані / резервісти](06-glava.md) | `polozhennia.r2.gl6` | {{ hits }} | 🟡 стаб |
{%- elsif n == 7 %}
| 7 | [Члени сімей військовослужбовців](07-glava.md) | `polozhennia.r2.gl7` | {{ hits }} | 🟡 стаб |
{%- elsif n == 8 %}
| 8 | [Робота з небезпечними джерелами](08-glava.md) | `polozhennia.r2.gl8` | {{ hits }} | 🟡 стаб |
{%- elsif n == 9 %}
| 9 | [Льотний склад](09-glava.md) | `polozhennia.r2.gl9` | {{ hits }} | 🟡 стаб |
{%- elsif n == 10 %}
| 10 | [Водолази і плавскладу](10-glava.md) | `polozhennia.r2.gl10` | {{ hits }} | 🟡 стаб |
{%- elsif n == 11 %}
| 11 | [ССО](11-glava.md) | `polozhennia.r2.gl11` | {{ hits }} | 🟡 стаб |
{%- elsif n == 12 %}
| 12 | [Парашутисти](12-glava.md) | `polozhennia.r2.gl12` | {{ hits }} | 🟡 стаб |
{%- elsif n == 13 %}
| 13 | [ДШВ](13-glava.md) | `polozhennia.r2.gl13` | {{ hits }} | 🟡 стаб |
{%- elsif n == 14 %}
| 14 | [ВМС](14-glava.md) | `polozhennia.r2.gl14` | {{ hits }} | 🟡 стаб |
{%- elsif n == 15 %}
| 15 | [Підводні човни](15-glava.md) | `polozhennia.r2.gl15` | {{ hits }} | 🟡 стаб |
{%- elsif n == 16 %}
| 16 | [Особливі види діяльності](16-glava.md) | `polozhennia.r2.gl16` | {{ hits }} | 🟡 стаб |
{%- elsif n == 17 %}
| 17 | [Повернення після поранення](17-glava.md) | `polozhennia.r2.gl17` | {{ hits }} | 🟡 стаб |
{%- elsif n == 18 %}
| 18 | [Контрольний медогляд](18-glava.md) | `polozhennia.r2.gl18` | {{ hits }} | 🟡 стаб |
{%- elsif n == 19 %}
| 19 | [Звільнення з військової служби](19-glava.md) | `polozhennia.r2.gl19` | {{ hits }} | 🟡 стаб |
{%- elsif n == 20 %}
| 20 | [Постанови ВЛК](20-glava.md) | `polozhennia.r2.gl20` | {{ hits }} | 🟡 стаб |
{%- elsif n == 21 %}
| 21 | [Причинний зв'язок захворювань і травм](21-glava.md) | `polozhennia.r2.gl21` | {{ hits }} | 🟡 стаб |
{%- elsif n == 22 %}
| 22 | [Спеціальні випадки](22-glava.md) | `polozhennia.r2.gl22` | {{ hits }} | 🟡 стаб |
{%- elsif n == 23 %}
| 23 | [Прикінцеві положення розділу](23-glava.md) | `polozhennia.r2.gl23` | {{ hits }} | 🟡 стаб |
{%- endif %}
{%- endfor %}

**Примітка:** колонка «Амендменти» — кількість записів в [`meta/amendments.yaml`](https://github.com/workflowcat/nakaz-402/blob/main/meta/amendments.yaml), що зачіпають цю главу. **0** = глава не зачіпалась в `affects` журналу (це не значить, що амендментів не було взагалі — багато з 23 записів мають `affects: []` і потребують розкладки по конкретних пунктах через PR).
