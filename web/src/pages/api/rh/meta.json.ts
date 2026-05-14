import type { APIRoute } from 'astro';
import { loadRhMeta } from '../../../lib/rh';

export const GET: APIRoute = async () => {
  const meta = loadRhMeta();
  // Annotate categories with severity index for client-side combination logic.
  const SEVERITY: Record<string, number> = {
    'А': 0, 'А-1': 1,
    'Б-1': 2, 'Б-2': 3, 'Б-3': 4, 'Б-4': 5, 'Б': 6,
    'В': 7,
    'Г': 8,
    'Д': 9,
  };
  const body = {
    categories: Object.entries(meta.katehorii).map(([code, description]) => ({
      code,
      description,
      severity: SEVERITY[code] ?? null,
    })),
    grafy: Object.entries(meta.grafy).map(([code, g]) => ({ code, ...g })),
    klasy: meta.klasy,
    combination_rule: {
      type: 'worst-wins',
      description:
        'Підсумкова категорія для людини з кількома ураженнями = найвища (найбільш обмежувальна) категорія серед усіх. Окремі статті можуть мати спеціальні правила сумації — їх це поле не описує.',
      severity_order: ['А', 'А-1', 'Б-1', 'Б-2', 'Б-3', 'Б-4', 'Б', 'В', 'Г', 'Д'],
    },
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};
