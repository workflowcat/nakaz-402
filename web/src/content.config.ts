import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Глави Положення + наказ — markdown файли з нашою frontmatter-схемою
const polozhennia = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/polozhennia' }),
  schema: z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    parent_id: z.string().optional(),
    title: z.string(),
    official_title: z.string().optional(),
    source: z.string().optional(),
    status: z.string().optional(),
    parent: z.string().optional(),
    grand_parent: z.string().optional(),
    nav_order: z.number().optional(),
    flavor: z.string().optional(),
    stub: z.boolean().optional(),
    original_redaction: z.union([z.string(), z.date()]).optional(),
    last_amended: z.object({
      date: z.union([z.string(), z.date()]),
      order: z.string(),
    }).optional(),
    amended_by: z.array(z.object({
      date: z.union([z.string(), z.date()]),
      order: z.string(),
      op: z.string().optional(),
      scope: z.string().optional(),
    })).optional(),
  }).passthrough(),
});

const nakaz = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/nakaz' }),
  schema: z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    number: z.string().optional(),
    ministry: z.string().optional(),
    signed_at: z.union([z.string(), z.date()]).optional(),
    registered_at: z.union([z.string(), z.date()]).optional(),
    registration_number: z.string().optional(),
    title: z.string(),
    official_title: z.string().optional(),
    source: z.string().optional(),
    status: z.string().optional(),
    current_redaction: z.string().optional(),
    flavor: z.string().optional(),
  }).passthrough(),
});

const dodatky = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/dodatky' }),
  schema: z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    parent_id: z.string().optional(),
    title: z.string(),
    official_title: z.string().optional(),
    short_title: z.string().optional(),
    source: z.string().optional(),
    status: z.string().optional(),
    nav_order: z.number().optional(),
    parent: z.string().optional(),
    stub: z.boolean().optional(),
  }).passthrough(),
});

// Draft amendments — proposals for changes to the order. Not official NPAs.
// Pattern matches "<year>-<NNN>-<slug>.md"; the README is excluded.
const drafts = defineCollection({
  loader: glob({ pattern: '[0-9]*.md', base: './src/content/drafts' }),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    proposed_by: z.string().optional(),
    proposed_at: z.union([z.string(), z.date()]).optional(),
    status: z.enum(['draft', 'review', 'adopted', 'rejected']).default('draft'),
    short_summary: z.string().optional(),
    adopted_order: z.string().optional(),       // when status=adopted, link to actual order
    flavor: z.string().optional(),
    operations: z.array(z.object({
      op: z.enum(['redaction', 'insert', 'repeal', 'restore']),
      target: z.string().optional(),            // for redaction/repeal/restore
      after: z.string().optional(),             // for insert (insert AFTER this id)
      before: z.string().optional(),            // for insert (insert BEFORE this id)
      new_id: z.string().optional(),            // for insert
      new_text: z.string().optional(),          // for redaction
      text: z.string().optional(),              // for insert
      rationale: z.string().optional(),
    })).default([]),
    discussion: z.object({
      github: z.string().optional(),
      contacts: z.array(z.string()).optional(),
    }).optional(),
    references: z.array(z.object({
      title: z.string(),
      url: z.string(),
    })).optional(),
  }).passthrough(),
});

export const collections = { polozhennia, nakaz, dodatky, drafts };
