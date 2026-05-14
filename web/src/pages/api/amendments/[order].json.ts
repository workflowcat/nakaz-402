import type { APIRoute, GetStaticPaths } from 'astro';
import { loadAmendments } from '../../../lib/amendments';

export const getStaticPaths: GetStaticPaths = () => {
  const { amendments } = loadAmendments();
  return amendments.map((a) => ({
    params: { order: a.order },
    props: { amendment: a },
  }));
};

export const GET: APIRoute = async ({ props, site }) => {
  const base = (site?.toString() ?? 'https://nakaz-402.vercel.app/').replace(/\/$/, '');
  const a = props.amendment as {
    order: string;
    signed_at: string;
    registration?: string;
    summary?: string;
    affects?: string[];
  };
  const body = {
    order: a.order,
    signed_at: a.signed_at,
    registration: a.registration ?? null,
    summary: a.summary ?? null,
    affects: a.affects ?? [],
    links: {
      self: `${base}/api/amendments/${a.order}.json`,
      list: `${base}/api/amendments.json`,
      rada: a.registration ? `https://zakon.rada.gov.ua/laws/show/${a.registration}` : null,
      web: `${base}/changes/#${a.order}`,
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
