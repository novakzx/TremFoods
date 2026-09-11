import { z } from 'zod';
import { cleanText } from '@/domains/shared-kernel/text';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const productSchema = z.object({
  name: z.string().min(2).max(80).transform((v) => cleanText(v, 80)),
  slug: z.string().regex(slugRegex, 'Slug inválido (use minúsculas e hífen: x-salada-da-casa)').max(80).optional(),
  priceCents: z.number().int().min(0).max(100000),
  categoryId: z.string().cuid(),
  image: z.string().max(500).refine((v) => /^(https?:\/\/|\/)/.test(v), 'Imagem: cole um link http(s) ou um caminho /img/…'),
  description: z.string().max(600).transform((v) => cleanText(v, 600)),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isVegetarian: z.boolean().default(false),
  isSpicy: z.boolean().default(false),
  sort: z.number().int().min(0).max(999).default(0),
  available: z.boolean().default(true),
});

// Patch explícito: sem `.default()`/`.partial()` — campos ausentes não podem
// ser confundidos com "repõe o default" (ex.: flags a false num update parcial).
export const productPatchSchema = z
  .object({
    name: z.string().min(2).max(80).transform((v) => cleanText(v, 80)).optional(),
    slug: z.string().regex(slugRegex, 'Slug inválido (use minúsculas e hífen: x-salada-da-casa)').max(80).optional(),
    priceCents: z.number().int().min(0).max(100000).optional(),
    categoryId: z.string().cuid().optional(),
    image: z.string().max(500).refine((v) => /^(https?:\/\/|\/)/.test(v), 'Imagem: cole um link http(s) ou um caminho /img/…').optional(),
    description: z.string().max(600).transform((v) => cleanText(v, 600)).optional(),
    isFeatured: z.boolean().optional(),
    isNew: z.boolean().optional(),
    isVegetarian: z.boolean().optional(),
    isSpicy: z.boolean().optional(),
    sort: z.number().int().min(0).max(999).optional(),
    available: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'Sem alterações.');

export const categorySchema = z.object({
  name: z.string().min(2).max(60).transform((v) => cleanText(v, 60)),
  slug: z.string().regex(slugRegex, 'Slug inválido').max(60).optional(),
  description: z.string().max(200).transform((v) => (v ? cleanText(v, 200) : null)).nullable().optional(),
  sort: z.number().int().min(0).max(999).default(0),
});

export const categoryPatchSchema = z
  .object({
    name: z.string().min(2).max(60).transform((v) => cleanText(v, 60)).optional(),
    slug: z.string().regex(slugRegex, 'Slug inválido').max(60).optional(),
    description: z.string().max(200).transform((v) => (v ? cleanText(v, 200) : null)).nullable().optional(),
    sort: z.number().int().min(0).max(999).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'Sem alterações.');

export const optionItemSchema = z.object({
  name: z.string().min(1).max(60).transform((v) => cleanText(v, 60)),
  priceCents: z.number().int().min(0).max(20000).default(0),
  available: z.boolean().default(true),
  sort: z.number().int().min(0).max(999).default(0),
});

export const optionGroupSchema = z.object({
  name: z.string().min(1).max(60).transform((v) => cleanText(v, 60)),
  required: z.boolean().default(true),
  multiple: z.boolean().default(false),
  maxSelect: z.number().int().min(2).max(20).nullable().default(null),
  sort: z.number().int().min(0).max(999).default(0),
  options: z.array(optionItemSchema).min(1, 'Cada grupo precisa de pelo menos 1 opção.').max(30),
});

export const optionsPutSchema = z.object({
  groups: z.array(optionGroupSchema).max(20),
});
