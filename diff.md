---
title: Diff
nav_order: 3
description: "Порівняти амендменти — що змінив конкретний наказ, як еволюціонував конкретний пункт"
permalink: /diff/
---


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


<script>
(function() {
  // ── Дані ──
  const AMENDMENTS = {{ site.data.amendments.amendments | jsonify }};

  // Маппінг id → шлях до сторінки глави, в якій лежить пункт
  const ID_TO_PAGE = {
    'polozhennia.r1.gl1': '/polozhennia/01-osnovy-organizatsii/01-zagalni-polozhennia/',
    'polozhennia.r1.gl2': '/polozhennia/01-osnovy-organizatsii/02-organy-vle/',
    'polozhennia.r1.gl3': '/polozhennia/01-osnovy-organizatsii/03-rozhliad-zvernen/',
    'polozhennia.r2.gl1': '/polozhennia/02-medychnyi-oglyad/01-zagalni-polozhennia/',
    'nakaz': '/nakaz/',
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
