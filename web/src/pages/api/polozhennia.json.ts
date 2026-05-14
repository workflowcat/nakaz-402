import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.toString() ?? 'https://nakaz-402.vercel.app/').replace(/\/$/, '');
  const entries = await getCollection('polozhennia');
  const items = entries
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => {
      const slug = e.id.replace(/\.md$/, '');
      return {
        id: e.data.id ?? null,
        slug,
        title: e.data.title,
        parent: e.data.parent ?? null,
        grand_parent: e.data.grand_parent ?? null,
        status: e.data.status ?? 'active',
        stub: e.data.stub === true,
        source: e.data.source ?? null,
        amendment_count: Array.isArray(e.data.amended_by) ? e.data.amended_by.length : 0,
        links: {
          self: `${base}/api/polozhennia/${slug}.json`,
          web: `${base}/polozhennia/${slug}/`,
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
