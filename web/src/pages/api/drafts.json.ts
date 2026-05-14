import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildPunktIdIndex, lintDraft, lintTerminology } from '../../lib/drafts';

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.toString() ?? 'https://nakaz-402.vercel.app/').replace(/\/$/, '');
  const drafts = await getCollection('drafts');
  const knownIds = await buildPunktIdIndex();

  const items = drafts
    .sort((a, b) => String(b.data.proposed_at ?? '').localeCompare(String(a.data.proposed_at ?? '')))
    .map((d) => {
      const others = drafts.filter((x) => x.id !== d.id);
      const findings = [
        ...lintDraft(d as any, knownIds, others as any),
        ...lintTerminology(d as any),
      ];
      const errors = findings.filter((f) => f.level === 'error').length;
      const warnings = findings.filter((f) => f.level === 'warning').length;
      return {
        id: d.data.id,
        slug: d.id.replace(/\.md$/, ''),
        title: d.data.title,
        status: d.data.status,
        proposed_by: d.data.proposed_by ?? null,
        proposed_at: typeof d.data.proposed_at === 'string'
          ? d.data.proposed_at
          : d.data.proposed_at?.toISOString?.().slice(0, 10) ?? null,
        short_summary: d.data.short_summary ?? null,
        operations_count: d.data.operations?.length ?? 0,
        lint: { errors, warnings, clean: errors === 0 && warnings === 0 },
        links: {
          self: `${base}/api/drafts/${d.id.replace(/\.md$/, '')}.json`,
          web: `${base}/drafts/${d.id.replace(/\.md$/, '')}/`,
        },
      };
    });

  return new Response(JSON.stringify({ count: items.length, items }, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
};
