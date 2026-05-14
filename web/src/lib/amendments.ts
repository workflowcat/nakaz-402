// @ts-expect-error - Vite raw-import for YAML; resolved at build time.
import amendmentsYamlRaw from '../content/_data/amendments.yaml?raw';
import { parse as parseYaml } from 'yaml';

export interface Amendment {
  order: string;
  signed_at: string;       // YYYY-MM-DD (normalized)
  registration?: string;
  summary?: string;
  affects?: string[];
}

export interface AmendmentsFile {
  base: {
    order: string;
    ministry: string;
    signed_at: string;
    registered_at?: string;
    registration?: string;
    title: string;
    source: string;
  };
  amendments: Amendment[];
}

function toIsoDate(v: unknown): string {
  if (v instanceof Date) return v.toISOString().split('T')[0];
  if (typeof v === 'string') return v;
  return '';
}

let _cache: AmendmentsFile | null = null;

export function loadAmendments(): AmendmentsFile {
  if (_cache) return _cache;
  const data = parseYaml(amendmentsYamlRaw as string) as AmendmentsFile;
  data.base.signed_at = toIsoDate(data.base.signed_at);
  if (data.base.registered_at) data.base.registered_at = toIsoDate(data.base.registered_at);
  data.amendments = (data.amendments ?? []).map((a) => ({
    ...a,
    signed_at: toIsoDate(a.signed_at),
  }));
  _cache = data;
  return data;
}

/** Amendments sorted newest first. */
export function loadAmendmentsDesc(): Amendment[] {
  const { amendments } = loadAmendments();
  return [...amendments].sort((a, b) => b.signed_at.localeCompare(a.signed_at));
}
