---
title: Зміни
nav_order: 2
wide: true
description: "Усі амендменти до наказу 402 — таймлайн, фільтри, статистика"
permalink: /changes/
---

{% include wide-topnav.html %}

# Управління змінами
{: .no_toc }

{% assign amendments = site.data.amendments.amendments | sort: "signed_at" | reverse %}
{% assign total = amendments | size %}
{% assign first = amendments | last %}
{% assign last = amendments | first %}
{% assign affects_total = 0 %}
{% for a in amendments %}{% if a.affects %}{% assign affects_total = affects_total | plus: a.affects.size %}{% endif %}{% endfor %}

<div class="stats">
  <div class="stat">
    <span class="value">{{ total }}</span>
    <span class="label">амендментів</span>
  </div>
  <div class="stat">
    <span class="value">{{ first.signed_at | date: "%Y" }}—{{ last.signed_at | date: "%Y" }}</span>
    <span class="label">діапазон років</span>
  </div>
  <div class="stat">
    <span class="value">{{ last.signed_at | date: "%d.%m.%Y" }}</span>
    <span class="label">останній амендмент</span>
  </div>
  <div class="stat">
    <span class="value">{{ affects_total }}</span>
    <span class="label">точкових правок</span>
  </div>
</div>

<div class="filters">
  <label data-op="insert" class="active"><input type="checkbox" checked> insert</label>
  <label data-op="redaction" class="active"><input type="checkbox" checked> redaction</label>
  <label data-op="edit" class="active"><input type="checkbox" checked> edit</label>
  <label data-op="repeal" class="active"><input type="checkbox" checked> repeal</label>
  <input type="text" class="search-box" id="ch-search" placeholder="фільтр по номеру або тексту...">
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
<div class="year-block">
  <h2 id="year-{{ year }}">{{ year }}</h2>
  <span class="year-count">{{ year_count }}</span>
  <span class="year-bar"></span>
</div>
  {% endunless %}

  {% assign has_ops = "" | split: "," %}
  {% if a.affects %}{% for aff in a.affects %}{% assign has_ops = has_ops | push: aff.op %}{% endfor %}{% endif %}
  {% assign ops_attr = has_ops | uniq | join: " " %}

<div class="amendment-card" data-year="{{ year }}" data-ops="{{ ops_attr }}" data-text="{{ a.order }} {{ a.summary | strip_newlines | downcase }}">
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
  const ops = new Set(['insert', 'redaction', 'edit', 'repeal']);
  let txt = '';
  const labels = document.querySelectorAll('.filters label[data-op]');
  const search = document.getElementById('ch-search');
  const counter = document.getElementById('ch-count');
  const cards = document.querySelectorAll('.amendment-card');

  function apply() {
    let shown = 0;
    cards.forEach(c => {
      const co = (c.dataset.ops || '').split(' ').filter(Boolean);
      const opOK = co.length === 0 || co.some(o => ops.has(o));
      const textOK = !txt || (c.dataset.text || '').includes(txt);
      const ok = opOK && textOK;
      c.style.display = ok ? '' : 'none';
      if (ok) shown++;
    });
    counter.textContent = `${shown} з ${cards.length}`;
    document.querySelectorAll('.year-block').forEach(yb => {
      let nx = yb.nextElementSibling;
      let any = false;
      while (nx && !nx.classList.contains('year-block')) {
        if (nx.classList.contains('amendment-card') && nx.style.display !== 'none') { any = true; break; }
        nx = nx.nextElementSibling;
      }
      yb.style.display = any ? '' : 'none';
    });
  }
  labels.forEach(l => l.addEventListener('click', e => {
    e.preventDefault();
    const o = l.dataset.op;
    const cb = l.querySelector('input');
    cb.checked = !cb.checked;
    l.classList.toggle('active', cb.checked);
    cb.checked ? ops.add(o) : ops.delete(o);
    apply();
  }));
  search.addEventListener('input', () => { txt = search.value.trim().toLowerCase(); apply(); });
  apply();
})();
</script>
