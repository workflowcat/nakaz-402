import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.toString() ?? 'https://nakaz-402.vercel.app/').replace(/\/$/, '');

  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'Наказ МОУ № 402 — Public API',
      version: '1.0.0',
      summary: 'Machine-readable JSON API for the git-edition of Order МОУ № 402 (military-medical examination).',
      description:
        'Read-only static API mirroring https://nakaz-402.vercel.app/. ' +
        'Authoritative source remains zakon.rada.gov.ua/laws/show/z1109-08; ' +
        'this engineering replication is published under CC0.',
      license: {
        name: 'CC0 1.0 Universal',
        url: 'https://creativecommons.org/publicdomain/zero/1.0/',
      },
      contact: {
        name: 'workflowcat/nakaz-402',
        url: 'https://github.com/workflowcat/nakaz-402',
      },
    },
    servers: [{ url: base, description: 'Production' }],
    externalDocs: {
      description: 'Authoritative source on rada.gov.ua',
      url: 'https://zakon.rada.gov.ua/laws/show/z1109-08',
    },
    paths: {
      '/api/index.json': {
        get: {
          summary: 'API root — list of all endpoints',
          operationId: 'getApiIndex',
          responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiIndex' } } } } },
        },
      },
      '/api/order.json': {
        get: {
          summary: 'Base order metadata',
          operationId: 'getOrder',
          responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } } },
        },
      },
      '/api/amendments.json': {
        get: {
          summary: 'All amendments, newest first',
          operationId: 'listAmendments',
          responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/AmendmentList' } } } } },
        },
      },
      '/api/amendments/{order}.json': {
        get: {
          summary: 'Single amendment by MOU order number',
          operationId: 'getAmendment',
          parameters: [{ name: 'order', in: 'path', required: true, schema: { type: 'string' }, example: '518' }],
          responses: {
            '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Amendment' } } } },
            '404': { description: 'Unknown order' },
          },
        },
      },
      '/api/polozhennia.json': {
        get: {
          summary: 'All chapters (глави) of the regulation',
          operationId: 'listPolozhennia',
          responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/PolozhenniaList' } } } } },
        },
      },
      '/api/polozhennia/{slug}.json': {
        get: {
          summary: 'Single chapter with full Markdown body',
          operationId: 'getPolozhennia',
          parameters: [
            { name: 'slug', in: 'path', required: true, schema: { type: 'string' }, example: '01-osnovy-organizatsii/01-zagalni-polozhennia' },
          ],
          responses: {
            '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Polozhennia' } } } },
            '404': { description: 'Unknown slug' },
          },
        },
      },
      '/api/glossary.json': {
        get: {
          summary: 'Ukrainian abbreviations used in the order',
          operationId: 'getGlossary',
          responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Glossary' } } } } },
        },
      },
      '/api/drafts.json': {
        get: {
          summary: 'List of all proposed amendments (drafts) with lint summary',
          operationId: 'listDrafts',
          responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/DraftList' } } } } },
        },
      },
      '/api/rh.json': {
        get: {
          summary: 'List of Розклад хвороб articles (stattia level)',
          operationId: 'listRh',
          responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/RhList' } } } } },
        },
      },
      '/api/rh/{stattia}.json': {
        get: {
          summary: 'One Розклад хвороб article with all punkty + category matrix',
          operationId: 'getRhStattia',
          parameters: [
            { name: 'stattia', in: 'path', required: true, schema: { type: 'string', pattern: '^\\d{3}$' }, example: '042' },
          ],
          responses: {
            '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/RhStattia' } } } },
            '404': { description: 'Unknown stattia' },
          },
        },
      },
      '/api/rh/meta.json': {
        get: {
          summary: 'РХ metadata: categories with severity order, grafy (contingents), klasy (ICD groups), combination rule',
          operationId: 'getRhMeta',
          responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/RhMeta' } } } } },
        },
      },
      '/api/drafts/{slug}.json': {
        get: {
          summary: 'Single draft with operations, lint findings, and generated formal citation text',
          operationId: 'getDraft',
          parameters: [
            { name: 'slug', in: 'path', required: true, schema: { type: 'string' }, example: '2026-001-trembita-electronic-records' },
          ],
          responses: {
            '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Draft' } } } },
            '404': { description: 'Unknown slug' },
          },
        },
      },
      '/changes/rss.xml': {
        get: {
          summary: 'RSS 2.0 feed of amendments',
          operationId: 'getRss',
          responses: { '200': { description: 'OK', content: { 'application/xml': {} } } },
        },
      },
      '/changes/atom.xml': {
        get: {
          summary: 'Atom 1.0 feed of amendments',
          operationId: 'getAtom',
          responses: { '200': { description: 'OK', content: { 'application/atom+xml': {} } } },
        },
      },
    },
    components: {
      schemas: {
        ApiIndex: {
          type: 'object',
          required: ['name', 'version', 'endpoints'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            version: { type: 'string' },
            license: { type: 'string', format: 'uri' },
            source_repo: { type: 'string', format: 'uri' },
            authoritative_source: { type: 'string', format: 'uri' },
            endpoints: { type: 'object', additionalProperties: { type: 'string' } },
            notes: { type: 'array', items: { type: 'string' } },
          },
        },
        Order: {
          type: 'object',
          required: ['order', 'ministry', 'signed_at', 'title'],
          properties: {
            order: { type: 'string', example: '402' },
            ministry: { type: 'string' },
            signed_at: { type: 'string', format: 'date', example: '2008-08-14' },
            registered_at: { type: 'string', format: 'date' },
            registration: { type: 'string', example: 'z1109-08' },
            title: { type: 'string' },
            source: { type: 'string', format: 'uri' },
            amendment_count: { type: 'integer' },
            last_amended_at: { type: 'string', format: 'date' },
            last_amendment_order: { type: ['string', 'null'] },
            last_amendment_registration: { type: ['string', 'null'] },
            links: { type: 'object', additionalProperties: { type: 'string' } },
          },
        },
        Amendment: {
          type: 'object',
          required: ['order', 'signed_at'],
          properties: {
            order: { type: 'string', example: '518' },
            signed_at: { type: 'string', format: 'date' },
            registration: { type: ['string', 'null'], example: 'z1167-25' },
            summary: { type: ['string', 'null'] },
            affects: { type: 'array', items: { type: 'string' } },
            links: { type: 'object', additionalProperties: { type: ['string', 'null'] } },
          },
        },
        AmendmentList: {
          type: 'object',
          required: ['count', 'items'],
          properties: {
            count: { type: 'integer' },
            items: { type: 'array', items: { $ref: '#/components/schemas/Amendment' } },
          },
        },
        PolozhenniaSummary: {
          type: 'object',
          required: ['slug', 'title'],
          properties: {
            id: { type: ['string', 'null'], example: 'polozhennia.r1.gl1' },
            slug: { type: 'string', example: '01-osnovy-organizatsii/01-zagalni-polozhennia' },
            title: { type: 'string' },
            parent: { type: ['string', 'null'] },
            grand_parent: { type: ['string', 'null'] },
            status: { type: 'string', enum: ['active', 'repealed', 'reserved'] },
            stub: { type: 'boolean' },
            source: { type: ['string', 'null'], format: 'uri' },
            amendment_count: { type: 'integer' },
            links: { type: 'object', additionalProperties: { type: 'string' } },
          },
        },
        PolozhenniaList: {
          type: 'object',
          required: ['count', 'items'],
          properties: {
            count: { type: 'integer' },
            items: { type: 'array', items: { $ref: '#/components/schemas/PolozhenniaSummary' } },
          },
        },
        Polozhennia: {
          allOf: [
            { $ref: '#/components/schemas/PolozhenniaSummary' },
            {
              type: 'object',
              properties: {
                type: { type: 'string', example: 'glava' },
                parent_id: { type: ['string', 'null'] },
                nav_order: { type: ['integer', 'null'] },
                original_redaction: { type: ['string', 'null'] },
                amended_by: { type: 'array', items: { type: 'object' } },
                body_markdown: { type: 'string', description: 'Full chapter text in Markdown' },
              },
            },
          ],
        },
        DraftOperation: {
          type: 'object',
          required: ['op'],
          properties: {
            op: { type: 'string', enum: ['redaction', 'insert', 'repeal', 'restore'] },
            target: { type: 'string' },
            after: { type: 'string' },
            before: { type: 'string' },
            new_id: { type: 'string' },
            new_text: { type: 'string' },
            text: { type: 'string' },
            rationale: { type: 'string' },
          },
        },
        LintFinding: {
          type: 'object',
          required: ['level', 'code', 'message'],
          properties: {
            level: { type: 'string', enum: ['error', 'warning', 'info'] },
            op_index: { type: 'integer' },
            code: { type: 'string', example: 'ref-not-found' },
            message: { type: 'string' },
            related: { type: 'array', items: { type: 'string' } },
          },
        },
        DraftSummary: {
          type: 'object',
          required: ['id', 'slug', 'title', 'status'],
          properties: {
            id: { type: 'string' },
            slug: { type: 'string' },
            title: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'review', 'adopted', 'rejected'] },
            proposed_by: { type: ['string', 'null'] },
            proposed_at: { type: ['string', 'null'], format: 'date' },
            short_summary: { type: ['string', 'null'] },
            operations_count: { type: 'integer' },
            lint: {
              type: 'object',
              properties: {
                errors: { type: 'integer' },
                warnings: { type: 'integer' },
                clean: { type: 'boolean' },
              },
            },
            links: { type: 'object', additionalProperties: { type: 'string' } },
          },
        },
        DraftList: {
          type: 'object',
          properties: {
            count: { type: 'integer' },
            items: { type: 'array', items: { $ref: '#/components/schemas/DraftSummary' } },
          },
        },
        Draft: {
          allOf: [
            { $ref: '#/components/schemas/DraftSummary' },
            {
              type: 'object',
              properties: {
                operations: { type: 'array', items: { $ref: '#/components/schemas/DraftOperation' } },
                references: { type: 'array', items: { type: 'object' } },
                discussion: { type: ['object', 'null'] },
                explanation_markdown: { type: 'string' },
                citation: { type: 'string', description: 'Formal "Внести зміни..." text generated from operations.' },
                lint: {
                  type: 'object',
                  properties: {
                    errors: { type: 'integer' },
                    warnings: { type: 'integer' },
                    findings: { type: 'array', items: { $ref: '#/components/schemas/LintFinding' } },
                  },
                },
              },
            },
          ],
        },
        RhPunkt: {
          type: 'object',
          required: ['id', 'opys', 'grafy'],
          properties: {
            id: { type: 'string', example: 'а' },
            opys: { type: 'string' },
            grafy: {
              type: 'object',
              description: 'Map of contingent code → fitness category code.',
              additionalProperties: { type: 'string', example: 'Б-3' },
            },
          },
        },
        RhStattiaSummary: {
          type: 'object',
          required: ['id', 'stattia', 'klas', 'nazva'],
          properties: {
            id: { type: 'string', example: 'dodatok.1.stattia.42' },
            stattia: { type: 'integer', example: 42 },
            klas: { type: 'string', example: 'I00-I99' },
            nazva: { type: 'string' },
            short_nazva: { type: 'string' },
            punkty_count: { type: 'integer' },
            punkty_ids: { type: 'array', items: { type: 'string' } },
            links: { type: 'object', additionalProperties: { type: 'string' } },
          },
        },
        RhList: {
          type: 'object',
          properties: {
            count: { type: 'integer' },
            items: { type: 'array', items: { $ref: '#/components/schemas/RhStattiaSummary' } },
          },
        },
        RhStattia: {
          allOf: [
            { $ref: '#/components/schemas/RhStattiaSummary' },
            {
              type: 'object',
              properties: {
                status: { type: 'string' },
                source: { type: ['string', 'null'] },
                punkty: { type: 'array', items: { $ref: '#/components/schemas/RhPunkt' } },
                last_amended: { type: ['object', 'null'] },
                references: { type: ['object', 'null'] },
              },
            },
          ],
        },
        RhCategory: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'Б-3' },
            description: { type: 'string' },
            severity: { type: ['integer', 'null'], description: 'Higher = more restrictive. Use to combine multiple diagnoses worst-wins.' },
          },
        },
        RhGrafa: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'I' },
            label: { type: 'string', example: 'Графа I' },
            audience: { type: 'string', example: 'Призовники' },
            notes: { type: 'string' },
          },
        },
        RhKlas: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'I00-I99' },
            nazva: { type: 'string' },
            statti_range: { type: 'string' },
          },
        },
        RhMeta: {
          type: 'object',
          properties: {
            categories: { type: 'array', items: { $ref: '#/components/schemas/RhCategory' } },
            grafy: { type: 'array', items: { $ref: '#/components/schemas/RhGrafa' } },
            klasy: { type: 'array', items: { $ref: '#/components/schemas/RhKlas' } },
            combination_rule: {
              type: 'object',
              properties: {
                type: { type: 'string', example: 'worst-wins' },
                description: { type: 'string' },
                severity_order: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
        Glossary: {
          type: 'object',
          required: ['count', 'items'],
          properties: {
            count: { type: 'integer' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['abbr', 'expansion'],
                properties: {
                  abbr: { type: 'string', example: 'ВЛК' },
                  expansion: { type: 'string', example: 'Військово-лікарська комісія' },
                },
              },
            },
          },
        },
      },
    },
  };

  return new Response(JSON.stringify(spec, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
};
