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

// ---- Next movement generator ----

export interface NextMovement {
  priority: 'high' | 'medium' | 'low';
  category: 'fix' | 'advance' | 'organize' | 'communicate';
  action: string;
  reason: string;
}

/**
 * Suggest concrete next steps for a campaign based on its current state.
 * Pure deterministic rules — no LLM. Output is actionable; reasons explain why.
 */
export function suggestNextMovement(
  campaign: CampaignEntry,
  draftsById: Map<string, DraftEntry>,
  campaignFindings: CampaignLintFinding[],
  memberFindings: CampaignLintFinding[],
): NextMovement[] {
  const moves: NextMovement[] = [];
  const members: DraftEntry[] = (campaign.data.member_drafts ?? [])
    .map((id) => draftsById.get(id))
    .filter((d): d is DraftEntry => !!d);

  const memberErrors = memberFindings.filter((f) => f.level === 'error');
  const memberWarnings = memberFindings.filter((f) => f.level === 'warning');
  const inDraft = members.filter((d) => d.data.status === 'draft');
  const inReview = members.filter((d) => d.data.status === 'review');
  const adopted = members.filter((d) => d.data.status === 'adopted');

  // ---- HIGH priority: fundamental problems that block progress ----

  if (!campaign.data.goal || campaign.data.goal.trim().length < 20) {
    moves.push({
      priority: 'high',
      category: 'organize',
      action: 'Сформулюйте мету кампанії (поле `goal` у YAML).',
      reason: 'Без чіткої мети зовнішнім стейкхолдерам важко зрозуміти, чого ви домагаєтеся, і кампанію неможливо успішно "продати".',
    });
  }

  if (members.length === 0 && campaign.data.status === 'active') {
    moves.push({
      priority: 'high',
      category: 'organize',
      action: 'Створіть перший драфт правки у /drafts/ і додайте до member_drafts.',
      reason: 'Активна кампанія без жодного драфта — це декларація без інструменту. Спочатку потрібен текст конкретної правки.',
    });
  }

  if (memberErrors.length > 0) {
    moves.push({
      priority: 'high',
      category: 'fix',
      action: `Виправте ${memberErrors.length} ${memberErrors.length === 1 ? 'помилку' : 'помилок'} у member-драфтах перед просуванням.`,
      reason: 'Драфти з помилками (неіснуючі посилання, конфлікти ID) не можна подавати до Мін\'юсту — вони будуть автоматично повернуті.',
    });
  }

  // ---- MEDIUM priority: structural issues that need addressing ----

  if (!campaign.data.target_audience || campaign.data.target_audience.length === 0) {
    moves.push({
      priority: 'medium',
      category: 'organize',
      action: 'Визначте target_audience: конкретні підрозділи МОУ, нар. депутатів, омбудсмана, які можуть просунути правки.',
      reason: 'Без чіткої цільової аудиторії неможливо планувати конкретні зустрічі або lobbying-кроки.',
    });
  }

  if (campaignFindings.some((f) => f.code === 'competing-targets-within-campaign')) {
    moves.push({
      priority: 'medium',
      category: 'organize',
      action: 'Узгодьте конкуруючі драфти: оберіть основний підхід або зведіть їх в один драфт.',
      reason: 'У кампанії є драфти, які конкурують за той самий пункт. Перед адопцією доведеться обрати — краще зробити це зараз.',
    });
  }

  if (inDraft.length === members.length && members.length > 0) {
    moves.push({
      priority: 'medium',
      category: 'advance',
      action: 'Переведіть один-два member-драфти зі статусу `draft` у `review`, коли вони готові.',
      reason: 'Усі member-драфти ще в чернетках — нікого з зовнішніх стейкхолдерів не запрошено до огляду. Стартуйте dyскусію.',
    });
  }

  if (memberWarnings.length > 0 && memberErrors.length === 0) {
    moves.push({
      priority: 'medium',
      category: 'fix',
      action: `Розгляньте ${memberWarnings.length} попередження у member-драфтах — особливо терміни-дрейф і конфлікти.`,
      reason: 'Попередження не блокують подання, але створюють shadow-debt: пізніше їх все одно треба буде вирішити, або наказ буде неконсистентний.',
    });
  }

  // ---- LOW priority: organisational housekeeping ----

  if (!campaign.data.next_actions || campaign.data.next_actions.length === 0) {
    moves.push({
      priority: 'low',
      category: 'organize',
      action: 'Опишіть 3-5 next_actions: конкретні зустрічі, документи, дедлайни.',
      reason: 'План з конкретними кроками легше виконати і легше делегувати членам коаліції.',
    });
  }

  if (!campaign.data.target_audience || (campaign.data.target_audience.length > 0 && (!members.length || inReview.length === 0))) {
    // Skip if conditions already covered above.
  }

  // ---- Positive signals: time to advance ----

  if (
    members.length > 0 &&
    memberErrors.length === 0 &&
    (inReview.length > 0 || inDraft.length > 0) &&
    campaign.data.status === 'active'
  ) {
    moves.push({
      priority: 'medium',
      category: 'communicate',
      action: 'Опублікуйте спільне звернення (з коаліцією) на основі member-драфтів.',
      reason: 'Драфти юридично готові, кампанія активна — час давати тиск ззовні. Прес-реліз, лист до МОУ, відкрите звернення.',
    });
    moves.push({
      priority: 'medium',
      category: 'advance',
      action: 'Заплануйте зустріч з юр. департаментом МОУ або профільним нар. депутатом.',
      reason: 'У вас є готовий проєкт тексту правки + обґрунтування — це найсильніша позиція для очної розмови.',
    });
  }

  if (adopted.length > 0 && adopted.length === members.length) {
    moves.push({
      priority: 'high',
      category: 'organize',
      action: 'Усі member-драфти прийнято — час змінити статус кампанії на `concluded`.',
      reason: 'Кампанія, яка лишається `active` після досягнення мети, замилює реальний стан системи.',
    });
  }

  return moves;
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
