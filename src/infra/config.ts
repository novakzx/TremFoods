import { z } from 'zod';

// Validação central das variáveis de ambiente com fallbacks seguros para build e runtime.
const schema = z.object({
  DATABASE_URL: z.string().min(1).default('postgresql://postgres:postgres@localhost:5432/tremfood'),
  AUTH_SECRET: z.string().min(1).default('trem-food-secret-fallback-key-32-chars-minimum-length-prod'),
  APP_URL: z.string().default(
    process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://tremfood.pt')
  ),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  MAIL_FROM: z.string().optional().default('Trem Food <no-reply@tremfood.pt>'),
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  REDIS_URL: z.string().optional().default(''),
  VAPID_PUBLIC_KEY: z.string().optional().default(''),
  VAPID_PRIVATE_KEY: z.string().optional().default(''),
  VAPID_SUBJECT: z.string().optional().default('mailto:ola@tremfood.pt'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success && process.env.NODE_ENV === 'development') {
  const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  console.warn(`[Config] Algumas variáveis usaram valores padrão: ${msg}`);
}

export const env = parsed.success ? parsed.data : schema.parse({});
export const isProd = process.env.NODE_ENV === 'production';

/** SMTP configurado? Sem SMTP os e-mails não saem — útil para saber se o link de
 *  verificação/reposição pode ser devolvido na resposta (apenas dev/testes). */
export const mailConfigured = Boolean(env.SMTP_HOST);
