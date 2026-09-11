import { z } from 'zod';

export const addItemSchema = z.object({
  productId: z.string().cuid(),
  qty: z.number().int().min(1).max(20).default(1),
  // Adicionais escolhidos (ids das opções) — validados no servidor contra os
  // grupos do produto; o preço é sempre recalculado a partir da BD.
  options: z.array(z.object({ itemId: z.string().cuid() })).max(30).optional().default([]),
});

export const setItemSchema = z.object({
  itemId: z.string().cuid(),
  qty: z.number().int().min(0).max(20),
});
