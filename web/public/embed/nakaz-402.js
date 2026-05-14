// nakaz-402 embed widget — single-file ES module.
// Drop on any page:
//   <script type="module" src="https://nakaz-402.vercel.app/embed/nakaz-402.js"></script>
//   <nakaz-402-amendments limit="5"></nakaz-402-amendments>
//   <nakaz-402-punkt slug="01-osnovy-organizatsii/01-zagalni-polozhennia" punkt="1.1"></nakaz-402-punkt>
//
// CC0 1.0 Universal. Authoritative: zakon.rada.gov.ua/laws/show/z1109-08.

const DEFAULT_BASE = 'https://nakaz-402.vercel.app';

const SHARED_CSS = `
  :host {
    display: block;
    font-family: -apple-system, system-ui, 'Segoe UI', Inter, sans-serif;
    line-height: 1.55;
    color: #2a2a3a;
    background: #ffffff;
    border: 1px solid #e5e5ee;
    border-radius: 8px;
    padding: 16px 20px;
    margin: 8px 0;
    max-width: 760px;
  }
  @media (prefers-color-scheme: dark) {
    :host {
      color: #e8e8f0;
      background: #14141c;
      border-color: #2a2a3a;
    }
  }
  a { color: #7253ed; }
  @media (prefers-color-scheme: dark) { a { color: #b8a4ff; } }
  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }
  .title { font-weight: 600; font-size: 0.95em; }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.7em;
    font-family: ui-monospace, monospace;
    background: #f5f3ff;
    color: #5b3fd9;
    border: 1px solid #d4c5ff;
  }
  @media (prefers-color-scheme: dark) {
    .badge {
      background: rgba(114, 83, 237, 0.15);
      color: #c4b1ff;
      border-color: rgba(114, 83, 237, 0.3);
    }
  }
  .meta {
    font-family: ui-monospace, monospace;
    font-size: 0.75em;
    color: #7a7a92;
  }
  .body { font-size: 0.92em; white-space: pre-wrap; }
  .footer {
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid #e5e5ee;
    font-size: 0.72em;
    color: #7a7a92;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  @media (prefers-color-scheme: dark) { .footer { border-color: #2a2a3a; } }
  ul { margin: 0; padding-left: 0; list-style: none; }
  li { padding: 6px 0; border-bottom: 1px solid #f0f0f5; display: flex; gap: 10px; align-items: baseline; }
  @media (prefers-color-scheme: dark) { li { border-color: #1f1f2c; } }
  li:last-child { border-bottom: none; }
  .date { font-family: ui-monospace, monospace; font-size: 0.78em; color: #7a7a92; min-width: 5.5rem; }
  .order { font-family: ui-monospace, monospace; font-size: 0.82em; min-width: 4rem; }
  .summary { font-size: 0.88em; flex: 1; }
  .skel { background: #f0f0f5; color: transparent; border-radius: 4px; display: inline-block; min-width: 60%; }
  @media (prefers-color-scheme: dark) { .skel { background: #1f1f2c; } }
  .err { color: #c43030; font-size: 0.85em; }
`;

function fmtDate(s) {
  if (!s) return '';
  const m = String(s).match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : s;
}

function getBase(el) {
  return (el.getAttribute('base') || DEFAULT_BASE).replace(/\/$/, '');
}

class NakazAmendments extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    const limit = Math.max(1, Math.min(50, parseInt(this.getAttribute('limit') || '5', 10)));
    const base = getBase(this);
    shadow.innerHTML = `
      <style>${SHARED_CSS}</style>
      <div class="head">
        <span class="title">Останні зміни до Наказу МОУ № 402</span>
        <span class="badge">live</span>
      </div>
      <ul><li><span class="skel">loading…</span></li></ul>
      <div class="footer">
        <a href="${base}/changes/" target="_blank" rel="noopener">Усі зміни →</a>
        <span>CC0 · <a href="${base}/" target="_blank" rel="noopener">nakaz-402</a></span>
      </div>
    `;
    const ul = shadow.querySelector('ul');
    fetch(`${base}/api/amendments.json`).then((r) => r.json()).then((data) => {
      const items = (data.items || []).slice(0, limit);
      if (!items.length) { ul.innerHTML = '<li><span class="summary">No data</span></li>'; return; }
      ul.innerHTML = items.map((a) => `
        <li>
          <span class="date">${fmtDate(a.signed_at)}</span>
          <a class="order" href="${a.links?.rada || a.links?.web || '#'}" target="_blank" rel="noopener">№ ${a.order}</a>
          <span class="summary">${(a.summary || '').replace(/</g, '&lt;')}</span>
        </li>
      `).join('');
    }).catch((err) => {
      ul.innerHTML = `<li><span class="err">Помилка: ${(err.message || err).toString()}</span></li>`;
    });
  }
}

class NakazPunkt extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    const slug = this.getAttribute('slug');
    const punkt = this.getAttribute('punkt');
    const base = getBase(this);
    if (!slug) {
      shadow.innerHTML = `<style>${SHARED_CSS}</style><div class="err">nakaz-402-punkt: missing "slug" attribute</div>`;
      return;
    }
    shadow.innerHTML = `
      <style>${SHARED_CSS}</style>
      <div class="head">
        <span class="title"><span class="skel">loading…</span></span>
        <span class="badge">live</span>
      </div>
      <div class="meta"><span class="skel">…</span></div>
      <div class="body"><span class="skel">loading text…</span></div>
      <div class="footer">
        <span></span>
        <span>CC0 · <a href="${base}/" target="_blank" rel="noopener">nakaz-402</a></span>
      </div>
    `;
    const $ = (s) => shadow.querySelector(s);
    fetch(`${base}/api/polozhennia/${slug}.json`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }).then((data) => {
      $('.title').textContent = data.title;
      $('.meta').textContent = [data.grand_parent, data.parent].filter(Boolean).join(' · ');
      const md = data.body_markdown || '';
      let text = md;
      if (punkt) {
        // Extract just this punkt: from "## N.M." header until the next "## " header.
        const re = new RegExp(`(^|\\n)## ${punkt.replace(/\./g, '\\.')}\\.?\\s*\\n([\\s\\S]*?)(?=\\n## \\d+\\.\\d+|\\n# |$)`);
        const m = md.match(re);
        text = m ? m[2].trim() : `(пункт ${punkt} не знайдено в цій главі)`;
      }
      // Strip HTML anchor tags and Jekyll-style nav lines for plain rendering.
      text = text.replace(/<a id="[^"]*"><\/a>/g, '').replace(/^---[\s\S]*?---\s*/m, '').trim();
      // Truncate very long content for embeds.
      const MAX = 1200;
      const truncated = text.length > MAX;
      if (truncated) text = text.slice(0, MAX).trim() + '…';
      $('.body').textContent = text;
      const footerLeft = shadow.querySelector('.footer span:first-child');
      footerLeft.innerHTML = `<a href="${data.links?.web || `${base}/polozhennia/${slug}/`}${punkt ? `#p${punkt}` : ''}" target="_blank" rel="noopener">Повний текст →</a>`;
    }).catch((err) => {
      $('.body').innerHTML = `<span class="err">Помилка: ${(err.message || err).toString()}</span>`;
    });
  }
}

if (!customElements.get('nakaz-402-amendments')) customElements.define('nakaz-402-amendments', NakazAmendments);
if (!customElements.get('nakaz-402-punkt')) customElements.define('nakaz-402-punkt', NakazPunkt);
