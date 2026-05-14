import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { buildPunktIdIndex, lintDraft, lintTerminology, generateCitation } from '../../../lib/drafts';

export const getStaticPaths: GetStaticPaths = async () => {
  const drafts = await getCollection('drafts');
  return drafts.map((d) => ({
    params: { slug: d.id.replace(/\.md$/, '') },
    props: { entry: d },
  }));
};

export const GET: APIRoute = async ({ props, site, params }) => {
  const base = (site?.toString() ?? 'https://nakaz-402.vercel.app/').replace(/\/$/, '');
  const entry = props.entry;
  const slug = params.slug as string;

  const drafts = await getCollection('drafts');
  const others = drafts.filter((d) => d.id !== entry.id);
  const knownIds = await buildPunktIdIndex();
  const findings = [
    ...lintDraft(entry as any, knownIds, others as any),
    ...lintTerminology(entry as any),
  ];

  const body = {
    id: entry.data.id,
    slug,
    title: entry.data.title,
    status: entry.data.status,
    proposed_by: entry.data.proposed_by ?? null,
    proposed_at: typeof entry.data.proposed_at === 'string'
      ? entry.data.proposed_at
      : entry.data.proposed_at?.toISOString?.().slice(0, 10) ?? null,
    short_summary: entry.data.short_summary ?? null,
    operations: entry.data.operations ?? [],
    references: entry.data.references ?? [],
    discussion: entry.data.discussion ?? null,
    explanation_markdown: entry.body ?? '',
    citation: generateCitation(entry as any),
    lint: {
      errors: findings.filter((f: any) => f.level === 'error').length,
      warnings: findings.filter((f: any) => f.level === 'warning').length,
      findings,
    },
    links: {
      self: `${base}/api/drafts/${slug}.json`,
      list: `${base}/api/drafts.json`,
      web: `${base}/drafts/${slug}/`,
      edit_on_github: `https://github.com/workflowcat/nakaz-402/edit/main/drafts/${entry.id}`,
    },
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
};
