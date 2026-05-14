import type { APIRoute } from 'astro';
import { loadAmendments } from '../../lib/amendments';

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.toString() ?? 'https://nakaz-402.vercel.app/').replace(/\/$/, '');
  const data = loadAmendments();
  const sorted = [...data.amendments].sort((a, b) => b.signed_at.localeCompare(a.signed_at));
  const latest = sorted[0];
  const body = {
    ...data.base,
    amendment_count: data.amendments.length,
    last_amended_at: latest?.signed_at ?? data.base.signed_at,
    last_amendment_order: latest?.order ?? null,
    last_amendment_registration: latest?.registration ?? null,
    links: {
      self: `${base}/api/order.json`,
      amendments: `${base}/api/amendments.json`,
      polozhennia: `${base}/api/polozhennia.json`,
      web: `${base}/`,
      rada: data.base.source,
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
