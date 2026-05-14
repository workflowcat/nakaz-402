import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { lintCampaign } from '../../lib/campaigns';
import { buildPunktIdIndex, lintDraft, lintTerminology } from '../../lib/drafts';

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.toString() ?? 'https://nakaz-402.vercel.app/').replace(/\/$/, '');
  const campaigns = await getCollection('campaigns');
  const drafts = await getCollection('drafts');
  const draftsById = new Map(drafts.map((d) => [d.data.id, d]));
  const knownIds = await buildPunktIdIndex();

  const items = campaigns
    .filter((c) => !c.id.toLowerCase().endsWith('readme.md'))
    .sort((a, b) => String(b.data.created_at ?? '').localeCompare(String(a.data.created_at ?? '')))
    .map((c) => {
      const memberDrafts = (c.data.member_drafts ?? []).map((id) => draftsById.get(id)).filter(Boolean);
      const cFindings = lintCampaign(c as any, draftsById as any);
      // Roll up member-draft lint:
      let memberErrors = 0;
      let memberWarnings = 0;
      for (const d of memberDrafts as any[]) {
        const others = drafts.filter((x) => x.id !== d.id);
        const findings = [
          ...lintDraft(d, knownIds, others as any),
          ...lintTerminology(d),
        ];
        memberErrors += findings.filter((f) => f.level === 'error').length;
        memberWarnings += findings.filter((f) => f.level === 'warning').length;
      }
      return {
        id: c.data.id,
        slug: c.id.replace(/\.md$/, ''),
        title: c.data.title,
        status: c.data.status,
        owner: c.data.owner ?? null,
        member_drafts_count: memberDrafts.length,
        lint: {
          campaign: {
            errors: cFindings.filter((f: any) => f.level === 'error').length,
            warnings: cFindings.filter((f: any) => f.level === 'warning').length,
            infos: cFindings.filter((f: any) => f.level === 'info').length,
          },
          members: { errors: memberErrors, warnings: memberWarnings },
        },
        links: {
          self: `${base}/api/campaigns/${c.id.replace(/\.md$/, '')}.json`,
          web: `${base}/campaigns/${c.id.replace(/\.md$/, '')}/`,
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
