import rss from '@astrojs/rss';
import type { APIContext, APIRoute } from 'astro';
import { loadAmendmentsDesc } from '../../lib/amendments';

export const GET: APIRoute = async (context: APIContext) => {
  const all = loadAmendmentsDesc();
  // Build items defensively: require title + pubDate be parseable.
  const items = all
    .filter((a) => a.signed_at && /^\d{4}-\d{2}-\d{2}$/.test(a.signed_at))
    .map((a) => {
      const link = a.registration
        ? `https://zakon.rada.gov.ua/laws/show/${a.registration}`
        : `https://nakaz-402.vercel.app/changes/#${a.order}`;
      return {
        title: `Наказ № ${a.order} від ${a.signed_at}`,
        pubDate: new Date(`${a.signed_at}T12:00:00Z`),
        description: a.summary ?? 'Зміни до Наказу МОУ № 402.',
        link,
      };
    });

  return rss({
    title: 'Зміни до Наказу МОУ № 402',
    description: 'Хронологія наказів-змін до Положення про військово-лікарську експертизу. Останній запис — найсвіжіша редакція.',
    site: context.site?.toString() ?? 'https://nakaz-402.vercel.app',
    customData: '<language>uk-UA</language>',
    items,
  });
};
