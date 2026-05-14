import type { APIContext } from 'astro';
import { loadAmendmentsDesc } from '../../lib/amendments';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(context: APIContext) {
  const site = (context.site?.toString() ?? 'https://nakaz-402.vercel.app/').replace(/\/$/, '');
  const items = loadAmendmentsDesc();
  const updated = items[0]?.signed_at
    ? new Date(items[0].signed_at + 'T12:00:00Z').toISOString()
    : new Date().toISOString();

  const entries = items.map((a) => {
    const id = a.registration
      ? `tag:nakaz-402,${a.signed_at}:${a.registration}`
      : `tag:nakaz-402,${a.signed_at}:order-${a.order}`;
    const link = a.registration
      ? `https://zakon.rada.gov.ua/laws/show/${a.registration}`
      : `${site}/changes/#${a.order}`;
    const ts = new Date(a.signed_at + 'T12:00:00Z').toISOString();
    return `  <entry>
    <id>${esc(id)}</id>
    <title>Наказ № ${esc(a.order)} від ${esc(a.signed_at)}</title>
    <link href="${esc(link)}" rel="alternate"/>
    <updated>${ts}</updated>
    <published>${ts}</published>
    <summary>${esc(a.summary ?? 'Зміни до Наказу МОУ № 402.')}</summary>
    <author><name>Міністерство оборони України</name></author>
  </entry>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="uk-UA">
  <id>${site}/changes/atom.xml</id>
  <title>Зміни до Наказу МОУ № 402</title>
  <subtitle>Хронологія наказів-змін до Положення про військово-лікарську експертизу.</subtitle>
  <link href="${site}/changes/atom.xml" rel="self" type="application/atom+xml"/>
  <link href="${site}/changes/" rel="alternate" type="text/html"/>
  <updated>${updated}</updated>
  <generator uri="https://astro.build/">Astro</generator>
  <rights>CC0 1.0 Universal</rights>
${entries}
</feed>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
  });
}
