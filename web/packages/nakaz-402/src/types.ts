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

export type DraftStatus = 'draft' | 'review' | 'adopted' | 'rejected';
export type DraftOp = 'redaction' | 'insert' | 'repeal' | 'restore';

export interface DraftOperation {
  op: DraftOp;
  target?: string;
  after?: string;
  before?: string;
  new_id?: string;
  new_text?: string;
  text?: string;
  rationale?: string;
}

export interface LintFinding {
  level: 'error' | 'warning' | 'info';
  op_index?: number;
  code: string;
  message: string;
  related?: string[];
}

export interface DraftSummary {
  id: string;
  slug: string;
  title: string;
  status: DraftStatus;
  proposed_by: string | null;
  proposed_at: IsoDate | null;
  short_summary: string | null;
  operations_count: number;
  lint: { errors: number; warnings: number; clean: boolean };
  links: Record<string, string>;
}

export interface Draft extends DraftSummary {
  operations: DraftOperation[];
  references: Array<{ title: string; url: string }>;
  discussion: { github?: string; contacts?: string[] } | null;
  explanation_markdown: string;
  citation: string;
  lint: { errors: number; warnings: number; findings: LintFinding[] };
}

export interface DraftList {
  count: number;
  items: DraftSummary[];
}

export type Contingent = 'I' | 'II' | 'III' | 'IV';

export interface RhPunkt {
  id: string;          // "а" | "б" | "в" …
  opys: string;
  grafy: Record<Contingent, string>;
}

export interface RhStattiaSummary {
  id: string;
  stattia: number;
  klas: string;
  nazva: string;
  short_nazva?: string;
  punkty_count: number;
  punkty_ids: string[];
  links: Record<string, string>;
}

export interface RhStattia extends RhStattiaSummary {
  status: string;
  source: string | null;
  punkty: RhPunkt[];
  last_amended: { date: IsoDate | string; order: string } | null;
  references: Record<string, string | string[]> | null;
}

export interface RhList {
  count: number;
  items: RhStattiaSummary[];
}

export interface RhCategory {
  code: string;        // "А", "Б-3", "Д"
  description: string;
  severity: number | null;
}

export interface RhGrafa {
  code: Contingent;
  label: string;
  audience: string;
  notes?: string;
}

export interface RhKlas {
  id: string;
  nazva: string;
  statti_range?: string;
}

export interface RhMeta {
  categories: RhCategory[];
  grafy: RhGrafa[];
  klasy: RhKlas[];
  combination_rule: {
    type: string;
    description: string;
    severity_order: string[];
  };
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
