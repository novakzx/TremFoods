import { z } from 'zod';
import { cleanText } from '@/domains/shared-kernel/text';

const phoneRegex = /^\+?[0-9]{9,15}$/;

export const checkoutSchema = z
  .object({
    customerName: z.string().min(2).max(80).transform((v) => cleanText(v, 80)),
    customerPhone: z.string().regex(phoneRegex, 'Indique um número de telefone válido'),
    customerEmail: z.string().trim().toLowerCase().email('E-mail inválido').max(160).optional().or(z.literal('')),
    deliveryMethod: z.enum(['DELIVERY', 'PICKUP']),
    addressStreet: z.string().max(120).optional().transform((v) => (v ? cleanText(v, 120) : '')),
    addressNumber: z.string().max(20).optional().transform((v) => (v ? cleanText(v, 20) : '')),
    addressCity: z.string().max(80).optional().transform((v) => (v ? cleanText(v, 80) : '')),
    addressPostal: z.string().max(20).optional().transform((v) => (v ? cleanText(v, 20) : '')),
    note: z.string().max(300).optional().transform((v) => (v ? cleanText(v, 300) : '')),
    paymentMethod: z.enum(['CASH', 'CARD', 'MBWAY', 'MULTIBANCO']),
  })
  .superRefine((data, ctx) => {
    if (data.deliveryMethod === 'DELIVERY') {
      if (!data.addressStreet) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['addressStreet'], message: 'Indique a rua' });
      if (!data.addressNumber) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['addressNumber'], message: 'Indique o número' });
      if (!data.addressCity) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['addressCity'], message: 'Indique a localidade' });
      if (!data.addressPostal) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['addressPostal'], message: 'Indique o código postal' });
    }
  });

export const adminStatusSchema = z.object({
  status: z.enum(['RECEIVED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']),
});
