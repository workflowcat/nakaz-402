// Hand-mirrored from /api/openapi.json @ nakaz-402.vercel.app
// CC0 1.0 Universal. Keep in sync when API evolves.

export type IsoDate = `${number}-${number}-${number}`;

export interface Order {
  order: string;
  ministry: string;
  signed_at: IsoDate;
  registered_at?: IsoDate;
  registration?: string;
  title: string;
  source: string;
  amendment_count: number;
  last_amended_at: IsoDate;
  last_amendment_order: string | null;
  last_amendment_registration: string | null;
  links: Record<string, string>;
}

export interface Amendment {
  order: string;
  signed_at: IsoDate;
  registration: string | null;
  summary: string | null;
  affects: string[];
  links: {
    self: string;
    list?: string;
    rada: string | null;
    web: string;
  };
}

export interface AmendmentList {
  count: number;
  items: Amendment[];
}

export type PolozhenniaStatus = 'active' | 'repealed' | 'reserved';

export interface PolozhenniaSummary {
  id: string | null;
  slug: string;
  title: string;
  parent: string | null;
  grand_parent: string | null;
  status: PolozhenniaStatus;
  stub: boolean;
  source: string | null;
  amendment_count: number;
  links: { self: string; web: string };
}

export interface AmendmentRef {
  date: IsoDate | string;
  order: string;
  op?: 'insert' | 'redaction' | 'edit' | 'repeal' | 'restore' | string;
  scope?: string;
}

export interface Polozhennia extends PolozhenniaSummary {
  type: string;
  parent_id: string | null;
  nav_order: number | null;
  original_redaction: string | null;
  amended_by: AmendmentRef[];
  body_markdown: string;
  links: PolozhenniaSummary['links'] & {
    list: string;
    rada: string | null;
    edit_on_github: string;
  };
}

export interface PolozhenniaList {
  count: number;
  items: PolozhenniaSummary[];
}

export interface GlossaryItem {
  abbr: string;
  expansion: string;
}

export interface Glossary {
  count: number;
  items: GlossaryItem[];
}

export interface ApiIndex {
  name: string;
  description: string;
  version: string;
  license: string;
  source_repo: string;
  authoritative_source: string;
  endpoints: Record<string, string>;
  notes: string[];
}
