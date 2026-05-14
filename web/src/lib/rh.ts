// Розклад хвороб (РХ) helpers — категорії, графи, класи.
// meta.yaml парситься через ?raw + yaml-парсер; парсимо тільки на сервері при build.

// @ts-expect-error - Vite raw import для YAML.
import metaYamlRaw from '../content/rh/meta.yaml?raw';
import { parse as parseYaml } from 'yaml';

export interface RhCategory {
  code: string;        // "А", "Б-3", "Д" etc.
  description: string;
}

export interface RhGrafa {
  code: string;        // "I", "II", "III", "IV"
  label: string;
  audience: string;
  notes?: string;
}

export interface RhKlas {
  id: string;          // "A00-B99"
  nazva: string;
  statti_range?: string;
}

interface RhMeta {
  katehorii: Record<string, string>;
  grafy: Record<string, { label: string; audience: string; notes?: string }>;
  klasy: RhKlas[];
}

let _meta: RhMeta | null = null;

export function loadRhMeta(): RhMeta {
  if (_meta) return _meta;
  _meta = parseYaml(metaYamlRaw as string) as RhMeta;
  return _meta;
}

export function getCategories(): RhCategory[] {
  const m = loadRhMeta();
  return Object.entries(m.katehorii).map(([code, description]) => ({ code, description }));
}

export function getGrafy(): RhGrafa[] {
  const m = loadRhMeta();
  return Object.entries(m.grafy).map(([code, g]) => ({ code, ...g }));
}

export function getKlasy(): RhKlas[] {
  return loadRhMeta().klasy;
}

export function categoryDescription(code: string): string {
  const m = loadRhMeta();
  return m.katehorii[code] ?? code;
}

export function grafaAudience(code: string): string {
  const m = loadRhMeta();
  return m.grafy[code]?.audience ?? code;
}

/** Колір категорії — для бейджів. Більш загрозливі → більш червоні. */
export function categoryColor(code: string): string {
  if (code === 'Д') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
  if (code === 'Г') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  if (code.startsWith('В')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300';
  if (code.startsWith('Б')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
  if (code.startsWith('А')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
  return 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300';
}
