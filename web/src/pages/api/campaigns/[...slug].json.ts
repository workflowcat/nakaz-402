import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { lintCampaign, rollUpMemberLint, suggestNextMovement } from '../../../lib/campaigns';
import { buildPunktIdIndex } from '../../../lib/drafts';

export const getStaticPaths: GetStaticPaths = async () => {
  const campaigns = await getCollection('campaigns');
  return campaigns
    .filter((c) => !c.id.toLowerCase().endsWith('readme.md'))
    .map((c) => ({
      params: { slug: c.id.replace(/\.md$/, '') },
      props: { entry: c },
    }));
};

export const GET: APIRoute = async ({ props, site, params }) => {
  const base = (site?.toString() ?? 'https://nakaz-402.vercel.app/').replace(/\/$/, '');
  const entry = props.entry;
  const slug = params.slug as string;
  const drafts = await getCollection('drafts');
  const draftsById = new Map(drafts.map((d) => [d.data.id, d]));
  const knownIds = await buildPunktIdIndex();

  const campaignFindings = lintCampaign(entry as any, draftsById as any);
  const memberFindings = rollUpMemberLint(entry as any, draftsById as any, knownIds, drafts as any);
  const suggestedMoves = suggestNextMovement(entry as any, draftsById as any, campaignFindings, memberFindings);

  const members = (entry.data.member_drafts ?? []).map((id: string) => {
    const d = draftsById.get(id);
    if (!d) return { id, missing: true };
    return {
      id: d.data.id,
      slug: d.id.replace(/\.md$/, ''),
      title: d.data.title,
      status: d.data.status,
    };
  });

  const affectedTargets = new Set<string>();
  for (const id of entry.data.member_drafts ?? []) {
    const d = draftsById.get(id);
    if (!d) continue;
    for (const op of (d.data.operations ?? [])) {
      if (op.target) affectedTargets.add(op.target);
      if (op.after) affectedTargets.add(op.after);
      if (op.before) affectedTargets.add(op.before);
    }
  }

  const body = {
    id: entry.data.id,
    slug,
    title: entry.data.title,
    status: entry.data.status,
    owner: entry.data.owner ?? null,
    created_at: typeof entry.data.created_at === 'string'
      ? entry.data.created_at
      : entry.data.created_at?.toISOString?.().slice(0, 10) ?? null,
    goal: entry.data.goal ?? null,
    target_audience: entry.data.target_audience ?? [],
    member_drafts: members,
    key_messages: entry.data.key_messages ?? [],
    metrics_of_success: entry.data.metrics_of_success ?? [],
    next_actions: entry.data.next_actions ?? [],
    references: entry.data.references ?? [],
    affected_punkti: [...affectedTargets],
    suggested_next_movement: suggestedMoves,
    brief_markdown: entry.body ?? '',
    lint: {
      campaign: {
        errors: campaignFindings.filter((f: any) => f.level === 'error').length,
        warnings: campaignFindings.filter((f: any) => f.level === 'warning').length,
        infos: campaignFindings.filter((f: any) => f.level === 'info').length,
        findings: campaignFindings,
      },
      members: {
        errors: memberFindings.filter((f: any) => f.level === 'error').length,
        warnings: memberFindings.filter((f: any) => f.level === 'warning').length,
        findings: memberFindings,
      },
    },
    links: {
      self: `${base}/api/campaigns/${slug}.json`,
      list: `${base}/api/campaigns.json`,
      web: `${base}/campaigns/${slug}/`,
      edit_on_github: `https://github.com/workflowcat/nakaz-402/edit/main/campaigns/${entry.id}`,
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
