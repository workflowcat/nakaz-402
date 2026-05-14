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
