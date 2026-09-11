import { z } from 'zod';

export const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keysP256dh: z.string().min(1).max(200),
  keysAuth: z.string().min(1).max(200),
  orderNumber: z.string().regex(/^TF-\d{6}$/, 'Número de pedido inválido').optional(),
  code: z.string().regex(/^\d{4}$/, 'Código inválido').optional(),
});

export const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});
