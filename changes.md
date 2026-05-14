---
title: Зміни
nav_order: 2
description: "Усі амендменти до наказу 402 — таймлайн, фільтри, статистика"
permalink: /changes/
---


# Управління змінами
{: .no_toc }

{% assign amendments = site.data.amendments.amendments | sort: "signed_at" | reverse %}
{% assign total = amendments | size %}
{% assign first = amendments | last %}
{% assign last = amendments | first %}
{% assign affects_total = 0 %}
{% for a in amendments %}{% if a.affects %}{% assign affects_total = affects_total | plus: a.affects.size %}{% endif %}{% endfor %}

<section class="heatmap-section">
  <div class="heatmap-head">
    <h2 class="heatmap-title">Карта активності</h2>
    <p class="heatmap-hint">Інтенсивність кольору ∝ кількість записів у <code>amendments.yaml</code>, що чіпають кожну главу. Hover — деталі. Click — перейти.</p>
  </div>
  <div id="heatmap-grid"></div>
</section>

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
// ── Heatmap of amendment density per глава ──
(function() {
  const AMD = {{ site.data.amendments.amendments | jsonify }};
  const grid = document.getElementById('heatmap-grid');
  if (!grid) return;

  // Aggregate за главами + наказом
  const counts = {};
  AMD.forEach(a => {
    (a.affects || []).forEach(aff => {
      const m = aff.id.match(/^(polozhennia\.r\d+\.gl\d+)/);
      if (m) counts[m[1]] = (counts[m[1]] || 0) + 1;
      else if (aff.id.startsWith('nakaz')) counts['nakaz'] = (counts['nakaz'] || 0) + 1;
    });
  });

  const BASE = '{{ "/" | relative_url }}'.replace(/\/$/, '');
  const URL_FOR = {
    'polozhennia.r1.gl1': BASE + '/polozhennia/01-osnovy-organizatsii/01-zagalni-polozhennia/',
    'polozhennia.r1.gl2': BASE + '/polozhennia/01-osnovy-organizatsii/02-organy-vle/',
    'polozhennia.r1.gl3': BASE + '/polozhennia/01-osnovy-organizatsii/03-rozhliad-zvernen/',
    'polozhennia.r2.gl1': BASE + '/polozhennia/02-medychnyi-oglyad/01-zagalni-polozhennia/',
  };
  for (let g = 2; g <= 23; g++) {
    const padded = ('0' + g).slice(-2);
    URL_FOR[`polozhennia.r2.gl${g}`] = `${BASE}/polozhennia/02-medychnyi-oglyad/${padded}-glava/`;
  }

  // Знаходимо max для нормалізації кольору
  const max = Math.max(1, ...Object.values(counts));

  function colorFor(count) {
    if (count === 0) return 'var(--bg-subtle)';
    const ratio = Math.min(1, count / max);
    // інтенсивність від 0.12 до 0.95
    const opacity = 0.18 + ratio * 0.72;
    return `rgba(114, 83, 237, ${opacity.toFixed(2)})`;
  }

  function renderRow(label, rNum, glavasCount) {
    const row = document.createElement('div');
    row.className = 'hm-row';
    const lbl = document.createElement('div');
    lbl.className = 'hm-label';
    lbl.textContent = label;
    row.appendChild(lbl);
    const cells = document.createElement('div');
    cells.className = 'hm-cells';
    for (let g = 1; g <= glavasCount; g++) {
      const id = `polozhennia.r${rNum}.gl${g}`;
      const count = counts[id] || 0;
      const cell = document.createElement('a');
      cell.className = 'hm-cell';
      cell.href = URL_FOR[id] || '#';
      cell.style.background = colorFor(count);
      cell.title = `Розд. ${rNum === 1 ? 'I' : 'II'} · Глава ${g} · ${count} амендмент${ukAmendSuffix(count)}`;
      cell.innerHTML = `<span class="hm-num">${g}</span>${count > 0 ? `<span class="hm-count">${count}</span>` : ''}`;
      if (count > max * 0.5) cell.classList.add('hm-light-fg');
      cells.appendChild(cell);
    }
    row.appendChild(cells);
    grid.appendChild(row);
  }

  function ukAmendSuffix(n) {
    const m100 = n % 100, m10 = n % 10;
    if (m100 >= 11 && m100 <= 14) return 'ів';
    if (m10 === 1) return '';
    if (m10 >= 2 && m10 <= 4) return 'и';
    return 'ів';
  }

  renderRow('Розділ I', 1, 3);
  renderRow('Розділ II', 2, 23);

  // Легенда
  const legend = document.createElement('div');
  legend.className = 'hm-legend';
  legend.innerHTML = `
    <span class="hm-leg-label">Менше</span>
    <span class="hm-leg-cell" style="background: var(--bg-subtle)"></span>
    <span class="hm-leg-cell" style="background: rgba(114, 83, 237, 0.3)"></span>
    <span class="hm-leg-cell" style="background: rgba(114, 83, 237, 0.55)"></span>
    <span class="hm-leg-cell" style="background: rgba(114, 83, 237, 0.8)"></span>
    <span class="hm-leg-label">Більше (макс: ${max})</span>
  `;
  grid.appendChild(legend);
})();

// ── Existing filter logic ──
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
