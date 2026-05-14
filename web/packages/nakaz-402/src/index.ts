// Typed fetch client for nakaz-402.vercel.app.
// Zero dependencies; works in browser, Node 18+, Deno, Bun, Cloudflare Workers.
//
// Usage:
//   import { createClient } from 'nakaz-402';
//   const api = createClient();
//   const order = await api.getOrder();
//   const all   = await api.listAmendments();
//   const one   = await api.getAmendment('518');
//   const glava = await api.getPolozhennia('01-osnovy-organizatsii/01-zagalni-polozhennia');

export * from './types.ts';
import type {
  ApiIndex, Order, Amendment, AmendmentList,
  Polozhennia, PolozhenniaList, Glossary,
} from './types.ts';

export interface ClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
}

export interface NakazClient {
  getApiIndex(): Promise<ApiIndex>;
  getOrder(): Promise<Order>;
  listAmendments(): Promise<AmendmentList>;
  getAmendment(order: string): Promise<Amendment>;
  listPolozhennia(): Promise<PolozhenniaList>;
  getPolozhennia(slug: string): Promise<Polozhennia>;
  getGlossary(): Promise<Glossary>;
  getOpenApi(): Promise<unknown>;
}

export function createClient(opts: ClientOptions = {}): NakazClient {
  const baseUrl = (opts.baseUrl ?? 'https://nakaz-402.vercel.app').replace(/\/$/, '');
  const f = opts.fetch ?? (globalThis.fetch?.bind(globalThis));
  if (!f) {
    throw new Error('nakaz-402: no global fetch found; pass opts.fetch.');
  }

  async function get<T>(path: string): Promise<T> {
    const res = await f(`${baseUrl}${path}`);
    if (!res.ok) {
      throw new Error(`nakaz-402 ${path}: ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  }

  return {
    getApiIndex:     ()              => get<ApiIndex>('/api/index.json'),
    getOrder:        ()              => get<Order>('/api/order.json'),
    listAmendments:  ()              => get<AmendmentList>('/api/amendments.json'),
    getAmendment:    (order: string) => get<Amendment>(`/api/amendments/${encodeURIComponent(order)}.json`),
    listPolozhennia: ()              => get<PolozhenniaList>('/api/polozhennia.json'),
    getPolozhennia:  (slug: string)  => get<Polozhennia>(`/api/polozhennia/${slug}.json`),
    getGlossary:     ()              => get<Glossary>('/api/glossary.json'),
    getOpenApi:      ()              => get('/api/openapi.json'),
  };
}

export default createClient;
