---
title: Зміни
nav_order: 6
description: "Візуалізація історії амендментів — таймлайн, фільтри, статистика"
permalink: /changes/
---

<style>
/* Dashboard стилі — інлайн, щоб GH Pages не вимагав окремий CSS-білд */
.changes-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
}
.stat-card {
  background: var(--code-background-color, #f5f6fa);
  border-left: 3px solid var(--link-color, #7253ed);
  padding: 0.75rem 1rem;
  border-radius: 4px;
}
.stat-card .stat-value {
  font-size: 1.75rem;
  font-weight: 600;
  line-height: 1.1;
  display: block;
}
.stat-card .stat-label {
  font-size: 0.75rem;
  color: var(--body-text-color);
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.year-block {
  margin: 2rem 0 1rem;
  padding-bottom: 0.25rem;
  border-bottom: 2px solid var(--border-color, #ddd);
}
.year-block h2 {
  margin: 0;
  display: inline-block;
  font-size: 1.6rem;
}
.year-block .year-count {
  margin-left: 0.5rem;
  font-size: 0.85rem;
  color: var(--body-text-color);
  opacity: 0.55;
  font-weight: 400;
}
.year-bar {
  display: inline-block;
  vertical-align: middle;
  height: 6px;
  background: linear-gradient(90deg, var(--link-color, #7253ed) 0%, transparent 100%);
  border-radius: 3px;
  margin-left: 0.75rem;
  vertical-align: middle;
}

.amendment-card {
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  padding: 0.85rem 1rem;
  margin: 0.6rem 0;
  background: var(--body-background-color, #fff);
  position: relative;
  transition: box-shadow 0.15s;
}
.amendment-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
/* Свіжість — підсвічуємо за роком */
.amendment-card[data-year="2025"] { border-left: 4px solid #e07c3e; }
.amendment-card[data-year="2024"] { border-left: 4px solid #c09c54; }
.amendment-card[data-year="2023"] { border-left: 4px solid #a4a4a4; }
.amendment-card[data-year="2022"],
.amendment-card[data-year="2021"],
.amendment-card[data-year="2020"] { border-left: 4px solid #888; }
.amendment-card[data-year^="201"] { border-left: 4px solid #aaa; }

.amendment-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-bottom: 0.35rem;
}
.amendment-date {
  font-family: var(--mono-font-family, monospace);
  font-size: 0.85rem;
  color: var(--body-text-color);
  opacity: 0.7;
}
.amendment-order {
  font-weight: 600;
  font-size: 1rem;
}
.amendment-reg a {
  font-family: var(--mono-font-family, monospace);
  font-size: 0.8rem;
  padding: 1px 6px;
  background: var(--code-background-color, #f0f0f5);
  border-radius: 3px;
  text-decoration: none;
}
.amendment-summary {
  font-size: 0.95rem;
  margin: 0.25rem 0 0.5rem;
  line-height: 1.45;
}
.affects-chips {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
  margin-top: 0.4rem;
}
.affects-chip {
  font-family: var(--mono-font-family, monospace);
  font-size: 0.72rem;
  padding: 2px 7px;
  border-radius: 10px;
  background: #eee;
}
.affects-chip[data-op="insert"]   { background: #d8efd9; color: #2d6a31; }
.affects-chip[data-op="redaction"] { background: #fde6c8; color: #8a5a1a; }
.affects-chip[data-op="edit"]     { background: #e3e6f0; color: #555; }
.affects-chip[data-op="repeal"]   { background: #f6d4d4; color: #7a2222; }
.affects-chip[data-op="restore"]  { background: #d8e3f0; color: #2a4a7a; }
.affects-chip .op {
  opacity: 0.65;
  margin-left: 4px;
}

/* Mini-legend */
.legend {
  font-size: 0.78rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin: 0.5rem 0 1rem;
}
.legend span {
  padding: 1px 7px;
  border-radius: 8px;
}
.legend .l-insert    { background: #d8efd9; color: #2d6a31; }
.legend .l-redaction { background: #fde6c8; color: #8a5a1a; }
.legend .l-edit      { background: #e3e6f0; color: #555; }
.legend .l-repeal    { background: #f6d4d4; color: #7a2222; }

/* Filters */
.filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin: 1rem 0;
  align-items: center;
}
.filters label {
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  padding: 3px 9px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 16px;
  background: var(--body-background-color);
}
.filters label.active {
  background: var(--link-color, #7253ed);
  color: white;
  border-color: var(--link-color, #7253ed);
}
.filters input[type="checkbox"] { display: none; }
.filters .search-box {
  flex: 1 1 200px;
  min-width: 200px;
  padding: 4px 10px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 16px;
  font-size: 0.85rem;
}
.filters .clear {
  font-size: 0.8rem;
  color: var(--link-color, #7253ed);
  cursor: pointer;
  text-decoration: underline;
  background: transparent;
  border: none;
}
.filters small {
  margin-left: auto;
  font-size: 0.8rem;
  opacity: 0.7;
}
</style>

# Управління змінами
{: .no_toc }

Уся історія наказу № 402 — таймлайн, статистика, фільтри. Дані з
[`meta/amendments.yaml`](https://github.com/workflowcat/nakaz-402/blob/main/meta/amendments.yaml),
сторінка генерується автоматично з тих самих джерел, що й [CHANGELOG](../CHANGELOG.md)
та калькулятор.

{% assign amendments = site.data.amendments.amendments | sort: "signed_at" | reverse %}
{% assign total = amendments | size %}
{% assign first = amendments | last %}
{% assign last = amendments | first %}
{% assign first_year = first.signed_at | date: "%Y" %}
{% assign last_year = last.signed_at | date: "%Y" %}

<div class="changes-stats">
  <div class="stat-card">
    <span class="stat-value">{{ total }}</span>
    <span class="stat-label">амендментів</span>
  </div>
  <div class="stat-card">
    <span class="stat-value">{{ first_year }}–{{ last_year }}</span>
    <span class="stat-label">діапазон років</span>
  </div>
  <div class="stat-card">
    <span class="stat-value">{{ last.signed_at | date: "%d.%m.%Y" }}</span>
    <span class="stat-label">останній амендмент</span>
  </div>
  {% assign affects_total = 0 %}
  {% for a in amendments %}{% if a.affects %}{% assign affects_total = affects_total | plus: a.affects.size %}{% endif %}{% endfor %}
  <div class="stat-card">
    <span class="stat-value">{{ affects_total }}</span>
    <span class="stat-label">точкових правок</span>
  </div>
</div>

<div class="legend">
  Тип правки:
  <span class="l-insert">insert</span> новий пункт
  <span class="l-redaction">redaction</span> повна нова редакція
  <span class="l-edit">edit</span> правка
  <span class="l-repeal">repeal</span> скасування
</div>

<div class="filters">
  <label data-op="insert" class="active"><input type="checkbox" checked> insert</label>
  <label data-op="redaction" class="active"><input type="checkbox" checked> redaction</label>
  <label data-op="edit" class="active"><input type="checkbox" checked> edit</label>
  <label data-op="repeal" class="active"><input type="checkbox" checked> repeal</label>
  <input type="text" class="search-box" id="ch-search" placeholder="фільтр по номеру/опису...">
  <button class="clear" id="ch-clear">скинути</button>
  <small id="ch-count"></small>
</div>

<div id="changes-list">

{% assign years_seen = "" | split: "," %}
{% for a in amendments %}
  {% assign year = a.signed_at | date: "%Y" %}
  {% unless years_seen contains year %}
    {% assign years_seen = years_seen | push: year %}
    {% assign year_count = 0 %}
    {% for b in amendments %}{% assign by = b.signed_at | date: "%Y" %}{% if by == year %}{% assign year_count = year_count | plus: 1 %}{% endif %}{% endfor %}
    {% assign bar_width = year_count | times: 18 %}
<div class="year-block">
  <h2 id="year-{{ year }}">{{ year }}</h2>
  <span class="year-count">{{ year_count }} амендментів</span>
  <span class="year-bar" style="width: {{ bar_width }}px"></span>
</div>
  {% endunless %}

  {% assign has_ops = "" | split: "," %}
  {% if a.affects %}{% for aff in a.affects %}{% assign has_ops = has_ops | push: aff.op %}{% endfor %}{% endif %}
  {% assign ops_attr = has_ops | uniq | join: " " %}

<div class="amendment-card" data-year="{{ year }}" data-ops="{{ ops_attr }}" data-order="{{ a.order }}" data-text="{{ a.summary | strip_newlines | downcase }}">
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

<script>
(function() {
  const filters = {
    ops: new Set(['insert', 'redaction', 'edit', 'repeal']),
    text: '',
  };

  const labels = document.querySelectorAll('.filters label[data-op]');
  const searchBox = document.getElementById('ch-search');
  const clearBtn = document.getElementById('ch-clear');
  const counter = document.getElementById('ch-count');
  const cards = document.querySelectorAll('.amendment-card');

  function apply() {
    let shown = 0;
    cards.forEach(card => {
      const ops = (card.dataset.ops || '').split(' ').filter(Boolean);
      const opMatch = ops.length === 0 || ops.some(op => filters.ops.has(op));
      const text = (card.dataset.text || '') + ' ' + (card.dataset.order || '');
      const txtMatch = !filters.text || text.includes(filters.text);
      const ok = opMatch && txtMatch;
      card.style.display = ok ? '' : 'none';
      if (ok) shown++;
    });
    counter.textContent = `показано ${shown} з ${cards.length}`;

    // ховаємо year-block якщо в ньому нічого не лишилось
    document.querySelectorAll('.year-block').forEach(yb => {
      let next = yb.nextElementSibling;
      let anyShown = false;
      while (next && !next.classList.contains('year-block')) {
        if (next.classList.contains('amendment-card') && next.style.display !== 'none') {
          anyShown = true;
          break;
        }
        next = next.nextElementSibling;
      }
      yb.style.display = anyShown ? '' : 'none';
    });
  }

  labels.forEach(label => {
    label.addEventListener('click', e => {
      e.preventDefault();
      const op = label.dataset.op;
      const cb = label.querySelector('input');
      cb.checked = !cb.checked;
      label.classList.toggle('active', cb.checked);
      if (cb.checked) filters.ops.add(op); else filters.ops.delete(op);
      apply();
    });
  });
  searchBox.addEventListener('input', () => {
    filters.text = searchBox.value.trim().toLowerCase();
    apply();
  });
  clearBtn.addEventListener('click', () => {
    filters.text = '';
    searchBox.value = '';
    filters.ops = new Set(['insert', 'redaction', 'edit', 'repeal']);
    labels.forEach(l => { l.classList.add('active'); l.querySelector('input').checked = true; });
    apply();
  });
  apply();
})();
</script>
