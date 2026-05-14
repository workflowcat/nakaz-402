#!/usr/bin/env node
// nakaz-402-mcp — MCP server that proxies the public nakaz-402 API as tools.
// Spawns over stdio; configure your MCP client with:
//   { "command": "npx", "args": ["-y", "nakaz-402-mcp"] }
//
// Tools exposed:
//   • get_order             — base order metadata
//   • list_amendments       — full amendments list
//   • get_amendment         — single amendment by order #
//   • list_polozhennia      — all chapters with slugs
//   • get_polozhennia       — single chapter (full markdown body)
//   • search_polozhennia    — substring search across all chapters
//   • get_glossary          — Ukrainian abbreviation expansions

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const BASE_URL = process.env.NAKAZ_402_BASE_URL || 'https://nakaz-402.vercel.app';

async function api(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`nakaz-402 ${path}: ${res.status} ${res.statusText}`);
  return res.json();
}

const TOOLS = [
  {
    name: 'get_order',
    description: 'Get base metadata for Order МОУ № 402 (ministry, signed date, latest amendment, source link).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_amendments',
    description: 'List every amendment to Order № 402, newest first. Each item has order number, signed date, summary, rada.gov.ua link.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_amendment',
    description: 'Get a single amendment by its MOU order number (e.g. "518").',
    inputSchema: {
      type: 'object',
      properties: { order: { type: 'string', description: 'MOU amendment order number, e.g. "518"' } },
      required: ['order'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_polozhennia',
    description: 'List every chapter (глава) of the regulation: slug, title, parent розділ, amendment count.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_polozhennia',
    description: 'Fetch a single chapter with full Markdown body. Slug example: "01-osnovy-organizatsii/01-zagalni-polozhennia".',
    inputSchema: {
      type: 'object',
      properties: { slug: { type: 'string', description: 'Chapter slug as in /polozhennia/{slug}/' } },
      required: ['slug'],
      additionalProperties: false,
    },
  },
  {
    name: 'search_polozhennia',
    description: 'Case-insensitive substring search across every chapter title and body. Returns matching chapters with a context snippet.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term (Ukrainian or English).' },
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_glossary',
    description: 'List all 25 Ukrainian abbreviations used in the order with their expansions (ВЛК, ЦВЛК, etc.).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_drafts',
    description: 'List proposed amendments (drafts) with status, operation count, and lint summary (errors / warnings / clean).',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['draft', 'review', 'adopted', 'rejected'],
          description: 'Optional filter: only return drafts in this status.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_rh',
    description: 'Перелік статей Розкладу хвороб (Додаток 1) — нозологічна назва, клас МКХ, кількість пунктів.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_rh_stattia',
    description: 'Повна стаття РХ з усіма пунктами та категоріями придатності за 4 графами (контингентами). Аргумент: stattia (номер 1-90, як число або zero-padded "042").',
    inputSchema: {
      type: 'object',
      properties: {
        stattia: { type: 'string', description: 'Номер статті ("42", "042", або число 42).' },
      },
      required: ['stattia'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_rh_meta',
    description: 'Метадані РХ: список категорій з severity-індексом, графи (контингенти), класи МКХ-10, формальне правило комбінації категорій (worst-wins).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'calc_fitness',
    description: 'Розрахунок підсумкової категорії придатності для людини з кількома діагнозами. Бере контингент (Graf I-IV) і список діагнозів {stattia, punkt}, повертає категорію за кожним діагнозом окремо + підсумок worst-wins.',
    inputSchema: {
      type: 'object',
      properties: {
        contingent: { type: 'string', enum: ['I', 'II', 'III', 'IV'], description: 'Графа: I=призовники, II=строкова/курсанти, III=офіцери/контракт, IV=військовозобов\'язані.' },
        diagnoses: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['stattia', 'punkt'],
            properties: {
              stattia: { type: ['string', 'integer'], description: 'Номер статті РХ.' },
              punkt: { type: 'string', description: 'Літера пункту: "а", "б", "в" тощо.' },
            },
          },
        },
      },
      required: ['contingent', 'diagnoses'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_draft',
    description: 'Fetch a single draft with full operations, references, lint findings, and the auto-generated formal "Внести зміни..." citation text ready to paste into a publishable change-act.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Draft slug, e.g. "2026-001-trembita-electronic-records".' },
      },
      required: ['slug'],
      additionalProperties: false,
    },
  },
];

async function callTool(name, args) {
  switch (name) {
    case 'get_order':        return api('/api/order.json');
    case 'list_amendments':  return api('/api/amendments.json');
    case 'get_amendment':    return api(`/api/amendments/${encodeURIComponent(args.order)}.json`);
    case 'list_polozhennia': return api('/api/polozhennia.json');
    case 'get_polozhennia':  return api(`/api/polozhennia/${args.slug}.json`);
    case 'get_glossary':     return api('/api/glossary.json');
    case 'list_drafts': {
      const list = await api('/api/drafts.json');
      if (args.status) {
        list.items = list.items.filter((d) => d.status === args.status);
        list.count = list.items.length;
      }
      return list;
    }
    case 'get_draft':        return api(`/api/drafts/${args.slug}.json`);
    case 'list_rh':          return api('/api/rh.json');
    case 'get_rh_meta':      return api('/api/rh/meta.json');
    case 'get_rh_stattia': {
      const num = String(args.stattia).padStart(3, '0');
      return api(`/api/rh/${num}.json`);
    }
    case 'calc_fitness': {
      const { contingent, diagnoses } = args;
      const meta = await api('/api/rh/meta.json');
      const severityMap = Object.fromEntries(meta.categories.map((c) => [c.code, c.severity ?? -1]));
      const grafaInfo = meta.grafy.find((g) => g.code === contingent);
      const results = [];
      for (const d of diagnoses) {
        const num = String(d.stattia).padStart(3, '0');
        const s = await api(`/api/rh/${num}.json`);
        const p = s.punkty.find((x) => x.id === d.punkt);
        if (!p) {
          results.push({ stattia: s.stattia, punkt: d.punkt, error: `Пункт "${d.punkt}" не знайдено в статті ${s.stattia}` });
          continue;
        }
        const cat = p.grafy[contingent] ?? null;
        const catDesc = meta.categories.find((c) => c.code === cat)?.description ?? null;
        results.push({
          stattia: s.stattia,
          stattia_name: s.short_nazva ?? s.nazva,
          punkt: d.punkt,
          punkt_opys: p.opys,
          category: cat,
          category_description: catDesc,
          severity: severityMap[cat] ?? null,
        });
      }
      const valid = results.filter((r) => !r.error && r.category);
      const worst = valid.reduce((a, b) =>
        (a?.severity ?? -1) >= (b?.severity ?? -1) ? a : b, null);
      return {
        contingent,
        contingent_audience: grafaInfo?.audience ?? null,
        per_diagnosis: results,
        summary: worst ? {
          category: worst.category,
          description: worst.category_description,
          driven_by: { stattia: worst.stattia, stattia_name: worst.stattia_name, punkt: worst.punkt },
        } : null,
        combination_rule: meta.combination_rule,
        disclaimer: 'Дані ілюстративні, результат не може замінити рішення ВЛК.',
      };
    }
    case 'search_polozhennia': {
      const list = await api('/api/polozhennia.json');
      const q = args.query.toLowerCase();
      const limit = args.limit ?? 10;
      const results = [];
      for (const item of list.items) {
        if (results.length >= limit) break;
        const titleHit = item.title.toLowerCase().includes(q);
        let snippet = null;
        let bodyHit = false;
        if (!titleHit) {
          const full = await api(`/api/polozhennia/${item.slug}.json`);
          const body = full.body_markdown ?? '';
          const idx = body.toLowerCase().indexOf(q);
          if (idx >= 0) {
            bodyHit = true;
            const start = Math.max(0, idx - 80);
            const end = Math.min(body.length, idx + args.query.length + 80);
            snippet = (start > 0 ? '…' : '') + body.slice(start, end) + (end < body.length ? '…' : '');
          }
        }
        if (titleHit || bodyHit) {
          results.push({
            slug: item.slug,
            title: item.title,
            parent: item.parent,
            match: titleHit ? 'title' : 'body',
            snippet,
            url: item.links.web,
          });
        }
      }
      return { query: args.query, count: results.length, results };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const server = new Server(
  { name: 'nakaz-402-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    const result = await callTool(name, args ?? {});
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Error: ${err.message ?? String(err)}` }],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
