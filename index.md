---
title: Головна
layout: default
nav_order: 1
description: "Наказ МОУ № 402 у git: машино-читабельний, з історією, з інструментами"
permalink: /
---

<div class="hero">
<p class="hero-eyebrow">Наказ МОУ № 402 · 14.08.2008 · z1109-08</p>
<h1>Військово-лікарська експертиза як дані, а не як docx</h1>
<p class="hero-lede">
Той самий нормативний акт, але кожен пункт має стабільний id, кожна правка
видима у git, а Розклад хвороб — таблиця, з якої можна порахувати придатність
скриптом.
</p>
<div class="hero-cta">
  <a class="primary" href="{{ '/changes/' | relative_url }}">📊 Усі зміни</a>
  <a href="{{ '/nakaz.html' | relative_url }}">Прочитати наказ</a>
  <a href="{{ '/examples/drafts/' | relative_url }}">Зразки DOCX-драфтів</a>
  <a href="https://github.com/workflowcat/nakaz-402" target="_blank" rel="noopener">GitHub ↗</a>
</div>
</div>

{% assign amendments = site.data.amendments.amendments | sort: "signed_at" | reverse %}
{% assign total = amendments | size %}
{% assign last = amendments | first %}
{% assign first = amendments | last %}
{% assign affects_total = 0 %}
{% for a in amendments %}{% if a.affects %}{% assign affects_total = affects_total | plus: a.affects.size %}{% endif %}{% endfor %}
{% assign year_now = "now" | date: "%Y" %}
{% assign last_year = last.signed_at | date: "%Y" %}
{% assign year_diff = year_now | minus: last_year %}

<div class="stats">
  <div class="stat">
    <span class="value">{{ total }}</span>
    <span class="label">амендментів</span>
  </div>
  <div class="stat">
    <span class="value">{{ affects_total }}</span>
    <span class="label">точкових правок</span>
  </div>
  <div class="stat">
    <span class="value">{{ first.signed_at | date: "%Y" }}—{{ last_year }}</span>
    <span class="label">діапазон років</span>
  </div>
  <div class="stat">
    <span class="value">{{ last.signed_at | date: "%d.%m.%Y" }}</span>
    <span class="label">останній амендмент</span>
  </div>
</div>

## Останні 5 амендментів

<div class="mini-feed">
{% assign last_five = amendments | slice: 0, 5 %}
{% for a in last_five %}
<div class="amendment-card" data-year="{{ a.signed_at | date: '%Y' }}">
  <div class="amendment-head">
    <span class="amendment-date">{{ a.signed_at | date: "%d.%m.%Y" }}</span>
    <span class="amendment-order">№ {{ a.order }}</span>
    <span class="amendment-reg"><a href="https://zakon.rada.gov.ua/laws/show/{{ a.registration }}" target="_blank" rel="noopener">{{ a.registration }}</a></span>
  </div>
  <div class="amendment-summary">{{ a.summary | strip_newlines }}</div>
  {% if a.affects and a.affects.size > 0 %}
  <div class="affects-chips">
    {% for aff in a.affects %}
    <span class="affects-chip" data-op="{{ aff.op }}"><code>{{ aff.id }}</code><span class="op">{{ aff.op }}</span></span>
    {% endfor %}
  </div>
  {% endif %}
</div>
{% endfor %}
</div>

[Усі {{ total }} амендментів →]({{ '/changes/' | relative_url }})

---

## Що це дає на практиці

**Юрист** хоче подивитись, що змінив наказ № 262 від 2024. Замість порівнювати дві pdf — відкриває [/changes/](/changes/), фільтрує, бачить chips з конкретними `id` зачеплених пунктів і одним кліком переходить.

**Розробник** хоче вбудувати «калькулятор придатності» в HR-систему. Робить `GET /api/dodatok-1/stattia-42.json` — і у відповіді машино-читабельна таблиця діагноз → категорія за всіма графами.

**Нормотворець** хоче скласти проєкт нового наказу-зміни. Запускає `make draft AMENDMENT=z0329-25` — отримує готовий .docx із заповненою порівняльною таблицею, залишається тільки вписати новий текст.

**Контриб'ютор** при виході справжнього наказу-зміни: один PR — оновлює YAML, лінтер перевіряє узгодженість, CHANGELOG регенерується автоматично. Все.

---

## Як це працює

Кожен пункт = окремий файл з YAML-frontmatter (`id`, `status`, `amended_by`). Глава Положення = один .md з якорями на пункти. Розклад хвороб = YAML по статті. Метадані амендментів = `meta/amendments.yaml`. Сайт, CHANGELOG, JSON-API, DOCX-драфти і калькулятор — це **функції** від цих даних.

[Тур по реальному амендменту →]({{ '/docs/walkthrough/' | relative_url }})

## Юридичне джерело

Авторитетним залишається текст на [zakon.rada.gov.ua](https://zakon.rada.gov.ua/laws/show/z1109-08). Цей репозиторій — інженерна реплікація.
