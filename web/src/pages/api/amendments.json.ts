import type { APIRoute } from 'astro';
import { loadAmendmentsDesc } from '../../lib/amendments';

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.toString() ?? 'https://nakaz-402.vercel.app/').replace(/\/$/, '');
  const items = loadAmendmentsDesc();
  const body = {
    count: items.length,
    items: items.map((a) => ({
      order: a.order,
      signed_at: a.signed_at,
      registration: a.registration ?? null,
      summary: a.summary ?? null,
      affects: a.affects ?? [],
      links: {
        self: `${base}/api/amendments/${a.order}.json`,
        rada: a.registration ? `https://zakon.rada.gov.ua/laws/show/${a.registration}` : null,
        web: `${base}/changes/#${a.order}`,
      },
    })),
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
};
