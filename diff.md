---
title: Diff
nav_order: 3
wide: true
description: "Порівняти амендменти — що змінив конкретний наказ, як еволюціонував конкретний пункт"
permalink: /diff/
---

{% include wide-topnav.html %}

<div class="hero" style="margin-bottom: 1.5rem">
<p class="hero-eyebrow">Аналіз змін</p>
<h1 style="font-size: 2rem">Diff inspector</h1>
<p class="hero-lede">Подивись, що саме змінив конкретний наказ. Або як еволюціонував конкретний пункт через всі його редакції.</p>
</div>

<div class="diff-tabs">
  <button class="diff-tab diff-tab-active" data-mode="by-order">За наказом</button>
  <button class="diff-tab" data-mode="by-punkt">За пунктом</button>
</div>

{% assign amendments = site.data.amendments.amendments | sort: "signed_at" | reverse %}

<!-- ────────────────────────────────────────────────
     Mode: BY ORDER — для кожного амендменту, що він зачепив
     ──────────────────────────────────────────────── -->

<div class="diff-mode" data-mode="by-order">

<div class="diff-controls">
  <select id="order-picker" class="diff-select">
    <option value="">— виберіть наказ-зміну —</option>
    {% for a in amendments %}
    <option value="{{ a.registration }}">
      № {{ a.order }} від {{ a.signed_at | date: "%d.%m.%Y" }}
      {% if a.affects and a.affects.size > 0 %}· {{ a.affects.size }} прав.{% endif %}
      — {{ a.summary | strip_newlines | truncate: 80 }}
    </option>
    {% endfor %}
  </select>
  <span class="diff-hint">або клікни на картку нижче</span>
</div>

<!-- Сітка карток амендментів (лише ті, що мають affects) -->
<div class="orders-grid">
{% for a in amendments %}
  {% if a.affects and a.affects.size > 0 %}
<div class="order-mini" data-reg="{{ a.registration }}" data-year="{{ a.signed_at | date: '%Y' }}">
  <div class="om-head">
    <span class="om-date">{{ a.signed_at | date: "%d.%m.%y" }}</span>
    <span class="om-order">№ {{ a.order }}</span>
    <span class="om-count">{{ a.affects.size }}×</span>
  </div>
  <div class="om-summary">{{ a.summary | strip_newlines | truncate: 90 }}</div>
</div>
  {% endif %}
{% endfor %}
</div>

<!-- Деталь: для обраного наказу — порівняльна "карта" -->
<div id="order-detail" class="order-detail" hidden>
  <!-- наповнюється JS -->
</div>

</div>

<!-- ────────────────────────────────────────────────
     Mode: BY PUNKT — для кожного унікального id, його хронологія
     ──────────────────────────────────────────────── -->

<div class="diff-mode" data-mode="by-punkt" hidden>

<div class="diff-controls">
  <select id="punkt-picker" class="diff-select">
    <option value="">— виберіть пункт —</option>
  </select>
  <span class="diff-hint">або клікни на картку нижче</span>
</div>

<!-- Сітка унікальних пунктів з картками, скільки разів кожен змінювали -->
<div class="punkts-grid" id="punkts-grid">
  <!-- наповнюється JS після обчислення -->
</div>

<div id="punkt-detail" class="punkt-detail" hidden>
  <!-- наповнюється JS -->
</div>

</div>

<style>
.diff-tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid var(--border);
  margin: 1.5rem 0 1.5rem;
}
.diff-tab {
  background: none;
  border: none;
  padding: 0.65rem 1rem 0.85rem;
  font-size: 0.95rem;
  cursor: pointer;
  color: var(--body-text-color);
  opacity: 0.65;
  border-bottom: 2px solid transparent;
  transition: all 0.12s;
  font-family: inherit;
  margin-bottom: -1px;
}
.diff-tab:hover { opacity: 0.9; }
.diff-tab-active {
  opacity: 1;
  font-weight: 600;
  border-bottom-color: var(--accent);
  color: var(--accent);
}
.diff-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0 1.5rem;
}
.diff-select {
  flex: 1;
  max-width: 560px;
  padding: 0.55rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.92rem;
  background: var(--body-background-color);
  font-family: inherit;
}
.diff-select:focus { outline: none; border-color: var(--accent); }
.diff-hint {
  font-size: 0.8rem;
  opacity: 0.55;
}

/* Картки амендментів */
.orders-grid, .punkts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.5rem;
  margin: 1rem 0 2rem;
}
.order-mini, .punkt-mini {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.65rem 0.8rem 0.75rem;
  cursor: pointer;
  background: var(--body-background-color);
  transition: all 0.12s;
}
.order-mini:hover, .punkt-mini:hover {
  border-color: var(--accent-soft);
  background: var(--accent-bg);
  transform: translateY(-1px);
}
.order-mini[data-year="2025"] { border-left: 3px solid var(--fresh-2025); }
.order-mini[data-year="2024"] { border-left: 3px solid var(--fresh-2024); }
.order-mini[data-year^="20"] { border-left: 3px solid var(--fresh-old); }
.order-mini.selected, .punkt-mini.selected {
  border-color: var(--accent);
  background: var(--accent-bg);
}
.om-head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.3rem;
  font-size: 0.85rem;
}
.om-date {
  font-family: var(--mono-font-family, monospace);
  font-size: 0.78rem;
  opacity: 0.6;
}
.om-order { font-weight: 600; }
.om-count {
  margin-left: auto;
  font-size: 0.7rem;
  padding: 1px 7px;
  background: var(--surface-2);
  border-radius: 8px;
  opacity: 0.75;
  font-family: var(--mono-font-family, monospace);
}
.om-summary {
  font-size: 0.82rem;
  line-height: 1.4;
  opacity: 0.88;
}

/* Punkt mini-card */
.punkt-mini {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.pm-id {
  font-family: var(--mono-font-family, monospace);
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.pm-count {
  margin-top: 0.4rem;
  font-size: 0.74rem;
  opacity: 0.7;
}
.pm-bar {
  margin-top: 0.5rem;
  width: 100%;
  height: 3px;
  background: var(--border);
  border-radius: 2px;
  position: relative;
  overflow: hidden;
}
.pm-bar-fill {
  position: absolute;
  top: 0; left: 0; bottom: 0;
  background: linear-gradient(90deg, var(--accent), var(--accent-soft));
  border-radius: 2px;
}

/* Order detail (правий пан) */
.order-detail, .punkt-detail {
  margin-top: 1.5rem;
  padding: 1.2rem 1.4rem 1.4rem;
  border: 1px solid var(--accent-soft);
  border-radius: 8px;
  background: var(--surface);
}
.od-head, .pd-head {
  display: flex;
  align-items: baseline;
  gap: 0.8rem;
  flex-wrap: wrap;
  margin-bottom: 0.8rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid var(--border);
}
.od-order, .pd-id {
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.od-date {
  font-family: var(--mono-font-family, monospace);
  opacity: 0.65;
}
.od-reg a {
  font-family: var(--mono-font-family, monospace);
  font-size: 0.85rem;
  padding: 2px 8px;
  background: var(--surface-2);
  border-radius: 3px;
  text-decoration: none;
}
.od-summary {
  font-size: 0.95rem;
  line-height: 1.55;
  margin: 0.5rem 0 1.2rem;
}

.affects-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.6rem;
}
@media (min-width: 900px) {
  .affects-list { grid-template-columns: 1fr 1fr; }
}
.affects-item {
  display: flex;
  gap: 0.8rem;
  padding: 0.7rem 0.9rem;
  background: var(--body-background-color);
  border: 1px solid var(--border);
  border-radius: 6px;
}
.affects-item .ai-id {
  font-family: var(--mono-font-family, monospace);
  font-size: 0.82rem;
  font-weight: 500;
  flex-shrink: 0;
}
.affects-item .ai-op {
  font-size: 0.7rem;
  padding: 1px 7px;
  border-radius: 8px;
  font-family: var(--mono-font-family, monospace);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  flex-shrink: 0;
  align-self: flex-start;
}
.affects-item .ai-op[data-op="insert"]    { background: var(--op-insert-bg); color: var(--op-insert); }
.affects-item .ai-op[data-op="redaction"] { background: var(--op-redaction-bg); color: var(--op-redaction); }
.affects-item .ai-op[data-op="edit"]      { background: var(--op-edit-bg); color: var(--op-edit); }
.affects-item .ai-op[data-op="repeal"]    { background: var(--op-repeal-bg); color: var(--op-repeal); }
.affects-item .ai-text {
  flex: 1;
  font-size: 0.85rem;
  line-height: 1.45;
  opacity: 0.88;
}
.affects-item .ai-text a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px dashed var(--accent-soft);
}

/* Punkt detail timeline */
.pt-timeline {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin: 0.8rem 0 0;
}
.pt-event {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.55rem 0.8rem;
  background: var(--body-background-color);
  border: 1px solid var(--border);
  border-radius: 5px;
  border-left: 3px solid var(--fresh-old);
}
.pt-event[data-year="2025"] { border-left-color: var(--fresh-2025); }
.pt-event[data-year="2024"] { border-left-color: var(--fresh-2024); }
.pt-event .pte-date {
  font-family: var(--mono-font-family, monospace);
  font-size: 0.8rem;
  min-width: 5rem;
  opacity: 0.7;
}
.pt-event .pte-op {
  font-size: 0.7rem;
  padding: 1px 7px;
  border-radius: 8px;
  font-family: var(--mono-font-family, monospace);
}
.pt-event .pte-op[data-op="insert"]    { background: var(--op-insert-bg); color: var(--op-insert); }
.pt-event .pte-op[data-op="redaction"] { background: var(--op-redaction-bg); color: var(--op-redaction); }
.pt-event .pte-op[data-op="edit"]      { background: var(--op-edit-bg); color: var(--op-edit); }
.pt-event .pte-op[data-op="repeal"]    { background: var(--op-repeal-bg); color: var(--op-repeal); }
.pt-event .pte-summary {
  flex: 1;
  font-size: 0.85rem;
  line-height: 1.45;
}
.pt-event .pte-summary a {
  color: var(--accent);
  text-decoration: none;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--body-text-color);
  opacity: 0.5;
  font-style: italic;
}
</style>

<script>
(function() {
  // ── Дані ──
  const AMENDMENTS = {{ site.data.amendments.amendments | jsonify }};

  // Маппінг id → шлях до сторінки глави, в якій лежить пункт
  const ID_TO_PAGE = {
    'polozhennia.r1.gl1': '/polozhennia/01-osnovy-organizatsii/01-zagalni-polozhennia.html',
    'polozhennia.r1.gl2': '/polozhennia/01-osnovy-organizatsii/02-organy-vle.html',
    'polozhennia.r1.gl3': '/polozhennia/01-osnovy-organizatsii/03-rozhliad-zvernen.html',
    'polozhennia.r2.gl1': '/polozhennia/02-medychnyi-oglyad/01-zagalni-polozhennia.html',
    'nakaz': '/nakaz.html',
  };
  const BASE = '{{ "/" | relative_url }}';

  function pageForId(id) {
    // Знайти найдовший префікс id, який є в ID_TO_PAGE
    let best = '';
    for (const k of Object.keys(ID_TO_PAGE)) {
      if ((id === k || id.startsWith(k + '.')) && k.length > best.length) best = k;
    }
    if (!best) return null;
    // anchor: остання частина після останнього "."
    const anchor = id.split('.').slice(-2).filter(p => p.startsWith('p')).pop();
    return BASE.replace(/\/$/, '') + ID_TO_PAGE[best] + (anchor ? '#' + anchor : '');
  }

  function humanLocator(id) {
    // polozhennia.r1.gl1.p1.4 → "Розділ I · Глава 1 · п. 1.4"
    const m = id.match(/^polozhennia\.r(\d+)(?:\.gl(\d+))?(?:\.p([\d.]+))?(?:\.([а-яіїєґ]))?/);
    if (!m) {
      const n = id.match(/^nakaz\.p(\d+)/);
      if (n) return 'наказ, п. ' + n[1];
      const d = id.match(/^dodatok\.(\d+)(?:\.stattia\.(\d+))?/);
      if (d) return 'Додаток ' + d[1] + (d[2] ? ', стаття ' + d[2] : '');
      return id;
    }
    const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
    const parts = ['Розд. ' + (roman[+m[1]] || m[1])];
    if (m[2]) parts.push('Гл. ' + m[2]);
    if (m[3]) parts.push('п. ' + m[3]);
    if (m[4]) parts.push('«' + m[4] + '»');
    return parts.join(' · ');
  }

  // ── Tab switching ──
  document.querySelectorAll('.diff-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-tab').forEach(b => b.classList.remove('diff-tab-active'));
      btn.classList.add('diff-tab-active');
      const mode = btn.dataset.mode;
      document.querySelectorAll('.diff-mode').forEach(m => {
        m.hidden = m.dataset.mode !== mode;
      });
    });
  });

  // ── Mode: By Order ──
  const orderPicker = document.getElementById('order-picker');
  const orderDetail = document.getElementById('order-detail');

  function showOrder(reg) {
    const a = AMENDMENTS.find(x => x.registration === reg);
    if (!a) {
      orderDetail.hidden = true;
      return;
    }
    const affects = (a.affects || []);
    const rows = affects.map(aff => {
      const pageUrl = pageForId(aff.id);
      const linkHtml = pageUrl
        ? `<a href="${pageUrl}">${humanLocator(aff.id)} →</a>`
        : humanLocator(aff.id);
      const scope = aff.scope ? `<div style="opacity:0.7;margin-top:3px">${aff.scope}</div>` : '';
      return `
        <div class="affects-item">
          <span class="ai-op" data-op="${aff.op}">${aff.op}</span>
          <div>
            <div class="ai-id">${aff.id}</div>
            <div class="ai-text">${linkHtml}${scope}</div>
          </div>
        </div>`;
    }).join('');

    orderDetail.innerHTML = `
      <div class="od-head">
        <span class="od-order">Наказ № ${a.order}</span>
        <span class="od-date">${formatDate(a.signed_at)}</span>
        <span class="od-reg"><a href="https://zakon.rada.gov.ua/laws/show/${a.registration}" target="_blank" rel="noopener">${a.registration} ↗</a></span>
      </div>
      <div class="od-summary">${a.summary || ''}</div>
      ${affects.length ? `<div class="affects-list">${rows}</div>` : '<div class="empty-state">У цього наказу немає розкладених affects[] — потребує заповнення.</div>'}
    `;
    orderDetail.hidden = false;
    // Підсвічуємо вибрану картку
    document.querySelectorAll('.order-mini').forEach(c => c.classList.toggle('selected', c.dataset.reg === reg));
    // Прокрутити
    setTimeout(() => orderDetail.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }

  orderPicker.addEventListener('change', e => showOrder(e.target.value));
  document.querySelectorAll('.order-mini').forEach(card => {
    card.addEventListener('click', () => {
      orderPicker.value = card.dataset.reg;
      showOrder(card.dataset.reg);
    });
  });

  // ── Mode: By Punkt ──
  // Збираємо унікальні id зі всіх amendments[].affects
  const punktIndex = new Map();
  AMENDMENTS.forEach(a => {
    (a.affects || []).forEach(aff => {
      if (!punktIndex.has(aff.id)) punktIndex.set(aff.id, []);
      punktIndex.get(aff.id).push({
        date: a.signed_at,
        order: a.order,
        registration: a.registration,
        op: aff.op,
        scope: aff.scope || '',
        summary: a.summary || '',
      });
    });
  });

  // Сортуємо за кількістю змін descending
  const sortedPunkts = Array.from(punktIndex.entries())
    .map(([id, events]) => ({
      id, count: events.length, events: events.sort((x, y) => x.date.localeCompare(y.date))
    }))
    .sort((a, b) => b.count - a.count);

  const maxCount = Math.max(1, ...sortedPunkts.map(p => p.count));
  const punktPicker = document.getElementById('punkt-picker');
  const punktsGrid = document.getElementById('punkts-grid');
  const punktDetail = document.getElementById('punkt-detail');

  sortedPunkts.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${humanLocator(p.id)}  (${p.id}, ${p.count} зм.)`;
    punktPicker.appendChild(opt);

    const card = document.createElement('div');
    card.className = 'punkt-mini';
    card.dataset.id = p.id;
    card.innerHTML = `
      <div class="pm-id">${p.id}</div>
      <div class="pm-count">${humanLocator(p.id)} · ${p.count} зм.</div>
      <div class="pm-bar"><div class="pm-bar-fill" style="width: ${(p.count / maxCount * 100).toFixed(0)}%"></div></div>
    `;
    card.addEventListener('click', () => showPunkt(p.id));
    punktsGrid.appendChild(card);
  });

  function showPunkt(id) {
    const data = punktIndex.get(id);
    if (!data) { punktDetail.hidden = true; return; }

    const pageUrl = pageForId(id);
    const events = data.sort((a, b) => b.date.localeCompare(a.date));

    const eventsHtml = events.map(e => {
      const year = (e.date + '').slice(0, 4);
      return `
        <div class="pt-event" data-year="${year}">
          <span class="pte-date">${formatDate(e.date)}</span>
          <span class="pte-op" data-op="${e.op}">${e.op}</span>
          <div class="pte-summary">
            <strong>№ ${e.order}</strong>
            <a href="https://zakon.rada.gov.ua/laws/show/${e.registration}" target="_blank" rel="noopener">${e.registration} ↗</a>
            ${e.scope ? '<div style="margin-top:3px;opacity:0.75">' + e.scope + '</div>' : ''}
            <div style="margin-top:3px;opacity:0.6;font-size:0.78rem">${e.summary || ''}</div>
          </div>
        </div>`;
    }).join('');

    punktDetail.innerHTML = `
      <div class="pd-head">
        <span class="pd-id">${id}</span>
        <span style="opacity:0.6">${humanLocator(id)}</span>
        ${pageUrl ? `<a href="${pageUrl}" style="margin-left:auto;color:var(--accent);text-decoration:none">Поточний текст →</a>` : ''}
      </div>
      <div style="font-size:0.85rem;opacity:0.7;margin-bottom:0.3rem">
        ${data.length} ${ukAmendWord(data.length)} · з ${formatDate(events[events.length-1].date)} по ${formatDate(events[0].date)}
      </div>
      <div class="pt-timeline">${eventsHtml}</div>
    `;
    punktDetail.hidden = false;

    document.querySelectorAll('.punkt-mini').forEach(c => c.classList.toggle('selected', c.dataset.id === id));
    setTimeout(() => punktDetail.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }

  punktPicker.addEventListener('change', e => e.target.value && showPunkt(e.target.value));

  function formatDate(s) {
    if (!s) return '';
    const d = String(s);
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}.${m[2]}.${m[1]}`;
    return d;
  }
  function ukAmendWord(n) {
    const m100 = n % 100, m10 = n % 10;
    if (m100 >= 11 && m100 <= 14) return 'амендментів';
    if (m10 === 1) return 'амендмент';
    if (m10 >= 2 && m10 <= 4) return 'амендменти';
    return 'амендментів';
  }
})();
</script>
