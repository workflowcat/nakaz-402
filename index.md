---
title: Головна
layout: default
nav_order: 1
description: "Наказ МОУ № 402 у git: машино-читабельний, з історією, з інструментами"
permalink: /
---


<div class="hero">
<p class="hero-eyebrow">Наказ МОУ № 402 · 14.08.2008</p>
<h1>Військово-лікарська експертиза як дані, а не як docx</h1>
<p class="hero-lede">
Той самий нормативний акт, але кожен пункт має стабільний id, кожна правка
видима у git, а Розклад хвороб — таблиця, з якої можна порахувати придатність
скриптом.
</p>
<div class="hero-cta">
  <a class="primary" href="{{ '/changes/' | relative_url }}">Усі зміни →</a>
  <a href="{{ '/nakaz/' | relative_url }}">Прочитати наказ</a>
  <a href="{{ '/examples/drafts/' | relative_url }}">Зразки DOCX</a>
  <a class="ghost" href="https://github.com/workflowcat/nakaz-402" target="_blank" rel="noopener">GitHub ↗</a>
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

## Останні зміни

<div class="mini-feed">
{% assign last_three = amendments | slice: 0, 3 %}
{% for a in last_three %}
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

<div class="use-cases">
<div class="uc">
<div class="uc-role">Юрист</div>
<div class="uc-text">Хоче подивитись, що змінив наказ № 262 від 2024. Замість порівнювати дві pdf — відкриває <a href="{{ '/changes/' | relative_url }}">/changes/</a>, фільтрує, бачить chips з конкретними <code>id</code> зачеплених пунктів і одним кліком переходить.</div>
</div>

<div class="uc">
<div class="uc-role">Розробник</div>
<div class="uc-text">Вбудовує «калькулятор придатності» в HR-систему. Робить <code>GET /api/dodatok-1/stattia-42.json</code> — і у відповіді машино-читабельна таблиця діагноз → категорія за всіма графами.</div>
</div>

<div class="uc">
<div class="uc-role">Нормотворець</div>
<div class="uc-text">Складає проєкт нового наказу-зміни. Запускає <code>make draft AMENDMENT=z0329-25</code> — отримує готовий .docx із заповненою порівняльною таблицею, залишається тільки вписати новий текст.</div>
</div>

<div class="uc">
<div class="uc-role">Контриб'ютор</div>
<div class="uc-text">При виході справжнього наказу-зміни — один PR оновлює YAML, лінтер перевіряє узгодженість, CHANGELOG регенерується автоматично.</div>
</div>
</div>

## Як це працює

Кожен пункт = окремий файл з YAML-frontmatter (`id`, `status`, `amended_by`). Глава Положення = один .md з якорями на пункти. Розклад хвороб = YAML по статті. Метадані амендментів — у [`meta/amendments.yaml`](https://github.com/workflowcat/nakaz-402/blob/main/meta/amendments.yaml). Сайт, CHANGELOG, JSON-API, DOCX-драфти і калькулятор — **функції** від цих даних.

[Тур по реальному амендменту →]({{ '/docs/walkthrough/' | relative_url }})

<p class="footer-source">Авторитетним залишається текст на <a href="https://zakon.rada.gov.ua/laws/show/z1109-08">zakon.rada.gov.ua</a>. Цей репозиторій — інженерна реплікація під <a href="https://github.com/workflowcat/nakaz-402/blob/main/LICENSE">CC0</a>.</p>
