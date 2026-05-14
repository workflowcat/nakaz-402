// Helpers for resolving draft-amendment operations against the live polozhennia body.

import { getCollection } from 'astro:content';

export interface ResolvedTarget {
  /** The glava that owns this anchor (its data.id, e.g. polozhennia.r1.gl1). */
  glavaId: string;
  /** Slug to render: "01-osnovy-organizatsii/01-zagalni-polozhennia" */
  slug: string;
  /** Anchor on that page, e.g. "p1.4" */
  anchor: string;
  /** The current text of that punkt, stripped of HTML anchors + amendment footnotes. */
  beforeText: string;
}

/**
 * Map a draft target like "polozhennia.r1.gl1.p1.4" to the glava entry and the
 * anchor on its page. Returns null if no matching glava exists.
 */
export async function resolveTarget(target: string): Promise<ResolvedTarget | null> {
  const entries = await getCollection('polozhennia');
  // Sort so longer ids match first (e.g. r1.gl10 before r1.gl1).
  const sorted = [...entries].sort((a, b) => (b.data.id?.length ?? 0) - (a.data.id?.length ?? 0));
  for (const e of sorted) {
    const gid = e.data.id;
    if (!gid) continue;
    if (target === gid) {
      return { glavaId: gid, slug: e.id.replace(/\.md$/, ''), anchor: '', beforeText: '' };
    }
    if (target.startsWith(gid + '.')) {
      const anchor = target.slice(gid.length + 1);
      const beforeText = extractPunkt(e.body ?? '', anchor);
      return { glavaId: gid, slug: e.id.replace(/\.md$/, ''), anchor, beforeText };
    }
  }
  return null;
}

/**
 * Extract a punkt from a glava's body markdown given an anchor like "p1.4".
 * The block spans from `<a id="p1.4">` up to the next `<a id="p…">` or end.
 * Amendment footnotes (lines starting "> *{") are kept — they're useful context.
 */
export function extractPunkt(body: string, anchor: string): string {
  if (!anchor) return body.trim();
  const startRe = new RegExp(`<a\\s+id="${anchor.replace(/\./g, '\\.')}"\\s*></a>`, 'i');
  const m = startRe.exec(body);
  if (!m) return '';
  const start = m.index + m[0].length;
  const rest = body.slice(start);
  const endRe = /<a\s+id="p\d/;  // next punkt anchor
  const endM = endRe.exec(rest);
  const segment = endM ? rest.slice(0, endM.index) : rest;
  return segment.replace(/^\s*\n?/, '').trimEnd();
}

/**
 * Diff-friendly tokenisation: split into word-level tokens preserving punctuation
 * and whitespace as separate tokens so we can render highlighted spans.
 */
export function tokenize(s: string): string[] {
  // Match runs of word characters, runs of whitespace, or single non-word chars.
  return s.match(/[\p{L}\p{N}_]+|\s+|[^\s\p{L}\p{N}_]/gu) ?? [];
}

import { diffWordsWithSpace } from 'diff';
// @ts-expect-error - Vite raw import for YAML; resolved at build time.
import terminologyYamlRaw from '../content/_data/terminology.yaml?raw';
import { parse as parseYaml } from 'yaml';

export interface DiffPart {
  /** 'eq' | 'add' | 'del' — equal, added (only in `after`), removed (only in `before`). */
  kind: 'eq' | 'add' | 'del';
  value: string;
}

/** Run a word-level diff. Returns flat list of parts in source order. */
export function wordDiff(before: string, after: string): DiffPart[] {
  const parts = diffWordsWithSpace(before, after, { ignoreCase: false });
  return parts.map((p) => ({
    kind: p.added ? 'add' : p.removed ? 'del' : 'eq',
    value: p.value,
  }));
}

/** Project the diff onto the "before" side: equal + removed segments only. */
export function diffBefore(parts: DiffPart[]): DiffPart[] {
  return parts.filter((p) => p.kind !== 'add');
}

/** Project the diff onto the "after" side: equal + added segments only. */
export function diffAfter(parts: DiffPart[]): DiffPart[] {
  return parts.filter((p) => p.kind !== 'del');
}

// ---- Linter ----

export interface LintFinding {
  level: 'error' | 'warning' | 'info';
  op_index?: number;          // 0-based index into operations array
  code: string;               // stable machine-readable code
  message: string;            // human-readable Ukrainian text
  related?: string[];         // related ids (e.g. conflicting draft ids)
}

export interface DraftOp {
  op: 'redaction' | 'insert' | 'repeal' | 'restore';
  target?: string;
  after?: string;
  before?: string;
  new_id?: string;
  new_text?: string;
  text?: string;
}

/**
 * Build a set of all existing pункт IDs across the whole order.
 * Each glava entry has `data.id` like "polozhennia.r1.gl1" and body anchors
 * like `<a id="p1.4">`. We compose to full ids like "polozhennia.r1.gl1.p1.4".
 */
export async function buildPunktIdIndex(): Promise<Set<string>> {
  const entries = await getCollection('polozhennia');
  const out = new Set<string>();
  for (const e of entries) {
    if (!e.data.id) continue;
    out.add(e.data.id);
    const body = e.body ?? '';
    const re = /<a\s+id="(p[0-9.]+)"\s*><\/a>/g;
    let m;
    while ((m = re.exec(body))) {
      out.add(`${e.data.id}.${m[1]}`);
    }
  }
  return out;
}

/**
 * Lint a single draft against the full set of known punkt IDs and other drafts.
 * other_drafts should NOT include the draft being linted itself.
 */
export function lintDraft(
  draft: { id: string; data: { id: string; operations?: DraftOp[]; status?: string } },
  knownIds: Set<string>,
  otherDrafts: Array<{ id: string; data: { id: string; operations?: DraftOp[]; status?: string } }>,
): LintFinding[] {
  const findings: LintFinding[] = [];
  const ops = draft.data.operations ?? [];

  // 1) Ref-exists: every `target`/`after`/`before` must resolve.
  ops.forEach((op, i) => {
    const refs: Array<[string, string]> = [];
    if (op.target) refs.push(['target', op.target]);
    if (op.after) refs.push(['after', op.after]);
    if (op.before) refs.push(['before', op.before]);
    for (const [field, id] of refs) {
      if (!knownIds.has(id)) {
        findings.push({
          level: 'error',
          op_index: i,
          code: 'ref-not-found',
          message: `Операція #${i + 1}: посилання \`${field}: ${id}\` не знайдено в чинній редакції.`,
        });
      }
    }
  });

  // 2) New-id uniqueness: insert.new_id must not collide with existing anchors
  //    or with any other draft's new_id.
  const otherNewIds = new Map<string, string>(); // new_id → draft id
  for (const d of otherDrafts) {
    if (d.data.status === 'rejected') continue;
    for (const o of d.data.operations ?? []) {
      if (o.op === 'insert' && o.new_id) otherNewIds.set(o.new_id, d.data.id);
    }
  }
  ops.forEach((op, i) => {
    if (op.op === 'insert' && op.new_id) {
      if (knownIds.has(op.new_id)) {
        findings.push({
          level: 'error',
          op_index: i,
          code: 'new-id-collision',
          message: `Операція #${i + 1}: новий ID \`${op.new_id}\` уже існує в чинній редакції.`,
        });
      }
      const other = otherNewIds.get(op.new_id);
      if (other) {
        findings.push({
          level: 'error',
          op_index: i,
          code: 'new-id-collision-draft',
          message: `Операція #${i + 1}: новий ID \`${op.new_id}\` уже зайнятий проєктом ${other}.`,
          related: [other],
        });
      }
    }
  });

  // 3) Conflict detection: another active draft targets the same pункт.
  const targetsHere = new Set<string>();
  ops.forEach((op) => { if (op.target) targetsHere.add(op.target); });
  for (const d of otherDrafts) {
    if (d.data.status === 'rejected') continue;
    for (const o of d.data.operations ?? []) {
      if (o.target && targetsHere.has(o.target)) {
        findings.push({
          level: 'warning',
          code: 'conflict-with-draft',
          message: `Проєкт ${d.data.id} також змінює \`${o.target}\` — узгодьте позиції перед адопцією.`,
          related: [d.data.id, o.target],
        });
      }
    }
  }

  // 4) Insert without an explicit anchor relative to existing content.
  ops.forEach((op, i) => {
    if (op.op === 'insert' && !op.after && !op.before) {
      findings.push({
        level: 'warning',
        op_index: i,
        code: 'insert-without-anchor',
        message: `Операція #${i + 1}: вставка без \`after\` або \`before\` — порядок у документі буде невизначеним.`,
      });
    }
    if (op.op === 'insert' && !op.new_id) {
      findings.push({
        level: 'warning',
        op_index: i,
        code: 'insert-without-new-id',
        message: `Операція #${i + 1}: вставка без \`new_id\` — інші проєкти не зможуть на неї посилатися.`,
      });
    }
    if (op.op === 'redaction' && !op.new_text) {
      findings.push({
        level: 'error',
        op_index: i,
        code: 'redaction-without-text',
        message: `Операція #${i + 1}: \`redaction\` без \`new_text\` — нічого пропонувати замість.`,
      });
    }
  });

  return findings;
}

// ---- Citation generator ----

const ROMAN: Record<string, string> = {
  '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V',
  '6': 'VI', '7': 'VII', '8': 'VIII', '9': 'IX', '10': 'X',
};

/**
 * Render a target id like "polozhennia.r1.gl1.p1.4" as a human-readable
 * reference: "пункт 1.4 глави 1 розділу I" (nominative) or
 * "пункту 1.4 глави 1 розділу I" (genitive).
 *
 * `caseForm` controls the head noun (пункт):
 *   'nom' → пункт / підпункт (subject form)
 *   'gen' → пункту / підпункту (after "після", "перед" etc.)
 *   'acc' → пункт / підпункт (same as nom for inanimate masc.)
 *
 * Modifier nouns "глави" and "розділу" are always genitive — the
 * Ukrainian "X of Y" pattern uses genitive on the modifier.
 */
export function formatTargetReference(
  target: string,
  caseForm: 'nom' | 'gen' | 'acc' = 'nom',
): string {
  const parts: string[] = [];
  const rozdil = target.match(/\.r(\d+)(?=\.|$)/);
  const glava = target.match(/\.gl(\d+)(?=\.|$)/);
  const punkt = target.match(/\.p(\d+\.\d+(?:\.\d+)?)(?=\.|$)/);
  if (punkt) {
    const num = punkt[1];
    const isSubpoint = (num.match(/\./g) ?? []).length >= 2;
    const head = isSubpoint
      ? (caseForm === 'gen' ? 'підпункту' : 'підпункт')
      : (caseForm === 'gen' ? 'пункту' : 'пункт');
    parts.push(`${head} ${num}`);
  } else if (glava && !punkt) {
    // Glava-level reference (no specific пункт) → adjust case for the head.
    const head = caseForm === 'gen' ? 'глави' : caseForm === 'acc' ? 'главу' : 'глава';
    parts.push(`${head} ${glava[1]}`);
  }
  // Always-genitive modifiers when chained:
  if (punkt && glava) parts.push(`глави ${glava[1]}`);
  if (rozdil) parts.push(`розділу ${ROMAN[rozdil[1]] ?? rozdil[1]}`);
  return parts.join(' ');
}

function formatInsertVerb(op: DraftOp): string {
  const anchor = op.after ?? op.before;
  const newPunktNum = op.new_id
    ? (op.new_id.match(/\.p(\d+\.\d+(?:\.\d+)?)$/) ?? [])[1] ?? ''
    : '';
  const newPunktPhrase = newPunktNum ? `новим пунктом ${newPunktNum}` : 'новим пунктом';
  if (!anchor) return `доповнити Положення ${newPunktPhrase} такого змісту`;

  // Parse anchor parts manually so we can compose accusative-glava + genitive-anchor.
  const rozdil = anchor.match(/\.r(\d+)/);
  const glava = anchor.match(/\.gl(\d+)/);
  const punkt = anchor.match(/\.p(\d+\.\d+(?:\.\d+)?)/);
  const isSubpoint = punkt ? (punkt[1].match(/\./g) ?? []).length >= 2 : false;
  const direction = op.after ? 'після' : 'перед';
  const punktGen = punkt
    ? `${isSubpoint ? 'підпункту' : 'пункту'} ${punkt[1]}`
    : '';
  const glavaAcc = glava ? `главу ${glava[1]}` : '';
  const rozdilGen = rozdil ? `розділу ${ROMAN[rozdil[1]] ?? rozdil[1]}` : '';
  // Standard MOU pattern: "главу N розділу X після пункту Y.Z доповнити новим пунктом A.B такого змісту"
  const glavaRef = [glavaAcc, rozdilGen].filter(Boolean).join(' ');
  return [glavaRef, punktGen ? `${direction} ${punktGen}` : '', `доповнити ${newPunktPhrase} такого змісту`]
    .filter(Boolean)
    .join(' ');
}

const OP_VERB: Record<string, (target: string, opData: DraftOp) => string> = {
  redaction: (t) => `${t} викласти в такій редакції`,
  insert: (_t, op) => formatInsertVerb(op),
  repeal: (t) => `${t} виключити`,
  restore: (t) => `${t} поновити`,
};

/**
 * Generate the formal "Внести зміни..." text from a draft.
 * Output is plain Ukrainian — same format MOU lawyers actually copy
 * into the change-act they file.
 */
export function generateCitation(draft: {
  data: {
    title?: string;
    operations?: DraftOp[];
  };
}): string {
  const ops = draft.data.operations ?? [];
  if (ops.length === 0) return '';

  const preamble =
    'Внести до Положення про військово-лікарську експертизу, затвердженого ' +
    'Наказом Міністерства оборони України від 14 серпня 2008 року № 402, ' +
    'такі зміни:';

  const body = ops.map((op, i) => {
    const target = op.target ?? op.after ?? op.before ?? '';
    const ref = formatTargetReference(target);
    const verb = OP_VERB[op.op]?.(ref, op) ?? `${ref} змінити`;
    const text = op.new_text ?? op.text;
    const indent = '   ';
    const quoted = text
      ? '\n' + indent + '«' + text.trim().split('\n').join('\n' + indent) + '»;'
      : ';';
    return `${i + 1}) ${verb}:${quoted}`;
  }).join('\n\n');

  return `${preamble}\n\n${body}`;
}

// ---- Terminology drift ----

export interface DeprecatedTerm {
  term: string;
  replace_with: string;
  since_order?: string | null;
  since_date?: string | Date | null;
  note?: string;
}

let _termCache: DeprecatedTerm[] | null = null;

export function loadDeprecatedTerms(): DeprecatedTerm[] {
  if (_termCache) return _termCache;
  const data = parseYaml(terminologyYamlRaw as string) as { deprecated_terms?: DeprecatedTerm[] };
  _termCache = data.deprecated_terms ?? [];
  return _termCache;
}

/**
 * Scan a draft's operation payload text for deprecated terminology.
 * Whole-word match (Cyrillic-aware) so that "аеромобільні" doesn't fire
 * inside "неаеромобільніший" etc.
 */
export function lintTerminology(draft: {
  data: { operations?: DraftOp[] };
}): LintFinding[] {
  const findings: LintFinding[] = [];
  const terms = loadDeprecatedTerms();
  const ops = draft.data.operations ?? [];

  ops.forEach((op, i) => {
    const payload = op.new_text ?? op.text ?? '';
    if (!payload) return;
    for (const t of terms) {
      // Escape regex metas, wrap with Unicode word boundaries.
      const esc = t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, 'iu');
      if (re.test(payload)) {
        const sourceNote = t.since_order
          ? `замінено наказом № ${t.since_order}${t.since_date ? ` від ${typeof t.since_date === 'string' ? t.since_date : (t.since_date as Date).toISOString().slice(0, 10)}` : ''}`
          : 'застаріла формулювання';
        findings.push({
          level: 'warning',
          op_index: i,
          code: 'terminology-drift',
          message: `Операція #${i + 1}: вживає застарілий термін «${t.term}» → канонічно зараз «${t.replace_with}» (${sourceNote}).`,
        });
      }
    }
  });

  return findings;
}
