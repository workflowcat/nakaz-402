import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';

export const getStaticPaths: GetStaticPaths = async () => {
  const stattii = await getCollection('rh');
  return stattii.map((s) => ({
    params: { stattia: String(s.data.stattia).padStart(3, '0') },
    props: { entry: s },
  }));
};

export const GET: APIRoute = async ({ props, site, params }) => {
  const base = (site?.toString() ?? 'https://nakaz-402.vercel.app/').replace(/\/$/, '');
  const entry = props.entry;
  const stattia = params.stattia as string;
  const body = {
    id: entry.data.id,
    stattia: entry.data.stattia,
    klas: entry.data.klas,
    nazva: entry.data.nazva,
    short_nazva: entry.data.short_nazva ?? null,
    status: entry.data.status ?? 'active',
    source: entry.data.source ?? null,
    last_amended: entry.data.last_amended ?? null,
    punkty: entry.data.punkty,
    references: entry.data.references ?? null,
    links: {
      self: `${base}/api/rh/${stattia}.json`,
      list: `${base}/api/rh.json`,
      meta: `${base}/api/rh/meta.json`,
      web: `${base}/rh/${stattia}/`,
      edit_on_github: `https://github.com/workflowcat/nakaz-402/edit/main/dodatky/01-rozklad-khvorob/stattia-${stattia}.yaml`,
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
