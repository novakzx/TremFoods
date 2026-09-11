import { z } from 'zod';
import { cleanText } from '@/domains/shared-kernel/text';

export const registerSchema = z.object({
  name: z.string().min(2).max(80).transform((v) => cleanText(v, 80)),
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(160),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(1).max(100),
});

export const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
});

export const resetSchema = z.object({
  token: z.string().min(10).max(200),
  password: z.string().min(8).max(100),
});
