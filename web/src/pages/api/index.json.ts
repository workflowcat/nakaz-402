import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.toString() ?? 'https://nakaz-402.vercel.app/').replace(/\/$/, '');
  const body = {
    name: 'Nakaz МОУ № 402 — JSON API',
    description: 'Read-only JSON API for the machine-readable git-edition of Nakaz МОУ № 402 (military medical examination).',
    version: '1.0.0',
    license: 'https://creativecommons.org/publicdomain/zero/1.0/',
    source_repo: 'https://github.com/workflowcat/nakaz-402',
    authoritative_source: 'https://zakon.rada.gov.ua/laws/show/z1109-08',
    endpoints: {
      order: `${base}/api/order.json`,
      amendments: `${base}/api/amendments.json`,
      amendment_by_order: `${base}/api/amendments/{order}.json`,
      polozhennia: `${base}/api/polozhennia.json`,
      polozhennia_by_slug: `${base}/api/polozhennia/{slug}.json`,
      glossary: `${base}/api/glossary.json`,
      drafts: `${base}/api/drafts.json`,
      draft_by_slug: `${base}/api/drafts/{slug}.json`,
      campaigns: `${base}/api/campaigns.json`,
      campaign_by_slug: `${base}/api/campaigns/{slug}.json`,
      rh_meta: `${base}/api/rh/meta.json`,
      rh_list: `${base}/api/rh.json`,
      rh_by_stattia: `${base}/api/rh/{NNN}.json`,
      openapi: `${base}/api/openapi.json`,
    },
    notes: [
      'All endpoints return UTF-8 JSON.',
      'Static build — no rate limits, but cache-friendly.',
      'Authoritative source remains rada.gov.ua; this API is a CC0 engineering replication.',
    ],
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
};
