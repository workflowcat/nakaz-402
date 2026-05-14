// Helpers for advocacy campaigns: lint + aggregation.

import type { LintFinding, DraftOp } from './drafts';
import { lintDraft, lintTerminology } from './drafts';

export interface CampaignEntry {
  id: string;
  data: {
    id: string;
    title: string;
    status: string;
    goal?: string;
    member_drafts: string[];
    target_audience?: string[];
    next_actions?: string[];
  };
}

export interface DraftEntry {
  id: string;
  data: {
    id: string;
    title: string;
    status: string;
    operations?: DraftOp[];
  };
}

export interface CampaignLintFinding extends LintFinding {
  draft_id?: string;       // for findings rolled up from member drafts
}

/**
 * Lint a campaign in isolation (member drafts already loaded).
 * Returns findings about the *campaign* itself — not individual member-draft
 * issues (those are rolled up separately for the UI).
 */
export function lintCampaign(
  campaign: CampaignEntry,
  draftsById: Map<string, DraftEntry>,
): CampaignLintFinding[] {
  const findings: CampaignLintFinding[] = [];
  const ids = campaign.data.member_drafts ?? [];

  // 1) Member-draft refs must resolve.
  for (const id of ids) {
    if (!draftsById.has(id)) {
      findings.push({
        level: 'error',
        code: 'member-not-found',
        message: `Драфт ${id} згаданий у member_drafts, але не існує в системі.`,
      });
    }
  }

  const members: DraftEntry[] = ids
    .map((id) => draftsById.get(id))
    .filter((d): d is DraftEntry => !!d);

  // 2) Member-rejected.
  for (const d of members) {
    if (d.data.status === 'rejected') {
      findings.push({
        level: 'warning',
        code: 'member-rejected',
        draft_id: d.data.id,
        message: `Драфт ${d.data.id} (${d.data.title}) має статус «відхилено» — варто прибрати з member_drafts кампанії.`,
      });
    }
  }

  // 3) Competing targets within the campaign — typically intentional, mark as info.
  const targetToDrafts = new Map<string, string[]>();
  for (const d of members) {
    for (const op of d.data.operations ?? []) {
      if (op.target) {
        const arr = targetToDrafts.get(op.target) ?? [];
        arr.push(d.data.id);
        targetToDrafts.set(op.target, arr);
      }
    }
  }
  for (const [target, draftIds] of targetToDrafts) {
    if (draftIds.length > 1) {
      findings.push({
        level: 'info',
        code: 'competing-targets-within-campaign',
        message: `Драфти ${draftIds.join(', ')} конкурують за один пункт ${target}. Якщо це навмисно — все добре, але до адопції треба буде обрати один.`,
        related: draftIds,
      });
    }
  }

  // 4) Status coherence.
  if (campaign.data.status === 'active' && members.length > 0) {
    const activeOrReview = members.filter((d) => d.data.status === 'draft' || d.data.status === 'review');
    if (activeOrReview.length === 0) {
      findings.push({
        level: 'warning',
        code: 'no-active-drafts',
        message: 'Кампанія активна, але жоден member-драфт не у статусі чернетки/огляду — або всі прийняті (час змінити статус кампанії на «завершено»), або всі відхилені (час «припинено»/«відмінено»).',
      });
    }
  }

  // 5) Empty member_drafts.
  if (members.length === 0 && campaign.data.status === 'active') {
    findings.push({
      level: 'warning',
      code: 'no-members',
      message: 'Активна кампанія без жодного member-драфту. Або додайте драфти, або змініть статус.',
    });
  }

  // 6) No goal.
  if (!campaign.data.goal || campaign.data.goal.trim().length < 20) {
    findings.push({
      level: 'info',
      code: 'thin-goal',
      message: 'Мета кампанії дуже коротка або відсутня — це робить кампанію складно зрозумілою для зовнішніх стейкхолдерів.',
    });
  }

  return findings;
}

/** Roll up lint findings from all member drafts to a single list. */
export function rollUpMemberLint(
  campaign: CampaignEntry,
  draftsById: Map<string, DraftEntry>,
  knownIds: Set<string>,
  allDrafts: DraftEntry[],
): CampaignLintFinding[] {
  const out: CampaignLintFinding[] = [];
  for (const id of campaign.data.member_drafts ?? []) {
    const d = draftsById.get(id);
    if (!d) continue;
    const others = allDrafts.filter((x) => x.id !== d.id);
    const findings = [
      ...lintDraft(d as any, knownIds, others as any),
      ...lintTerminology(d as any),
    ];
    for (const f of findings) {
      out.push({ ...f, draft_id: d.data.id });
    }
  }
  return out;
}
