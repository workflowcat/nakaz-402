import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.toString() ?? 'https://nakaz-402.vercel.app/').replace(/\/$/, '');
  const stattii = await getCollection('rh');
  const items = stattii
    .sort((a, b) => a.data.stattia - b.data.stattia)
    .map((s) => ({
      id: s.data.id,
      stattia: s.data.stattia,
      klas: s.data.klas,
      nazva: s.data.nazva,
      short_nazva: s.data.short_nazva ?? s.data.nazva,
      punkty_count: s.data.punkty.length,
      punkty_ids: s.data.punkty.map((p: any) => p.id),
      links: {
        self: `${base}/api/rh/${String(s.data.stattia).padStart(3, '0')}.json`,
        web: `${base}/rh/${String(s.data.stattia).padStart(3, '0')}/`,
      },
    }));
  return new Response(JSON.stringify({ count: items.length, items }, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
};
