import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';

export const getStaticPaths: GetStaticPaths = async () => {
  const entries = await getCollection('polozhennia');
  return entries.map((e) => ({
    params: { slug: e.id.replace(/\.md$/, '') },
    props: { entry: e },
  }));
};

export const GET: APIRoute = async ({ props, site, params }) => {
  const base = (site?.toString() ?? 'https://nakaz-402.vercel.app/').replace(/\/$/, '');
  const entry = props.entry;
  const slug = params.slug as string;
  const body = {
    id: entry.data.id ?? null,
    slug,
    title: entry.data.title,
    type: entry.data.type ?? 'glava',
    parent_id: entry.data.parent_id ?? null,
    parent: entry.data.parent ?? null,
    grand_parent: entry.data.grand_parent ?? null,
    status: entry.data.status ?? 'active',
    stub: entry.data.stub === true,
    source: entry.data.source ?? null,
    nav_order: entry.data.nav_order ?? null,
    original_redaction: entry.data.original_redaction ?? null,
    amended_by: entry.data.amended_by ?? [],
    body_markdown: entry.body ?? '',
    links: {
      self: `${base}/api/polozhennia/${slug}.json`,
      list: `${base}/api/polozhennia.json`,
      web: `${base}/polozhennia/${slug}/`,
      rada: entry.data.source ?? null,
      edit_on_github: `https://github.com/workflowcat/nakaz-402/edit/main/polozhennia/${entry.id}`,
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
