import { z } from 'zod';

export const isProd = process.env.NODE_ENV === 'production';

// Validação central das variáveis de ambiente. Nenhum segredo tem valor por
// omissão: o que faltar fica vazio e a funcionalidade correspondente desliga-se.
const schema = z.object({
  DATABASE_URL: z.string().optional().default(''),
  APP_URL: z
    .string()
    .default(
      process.env.APP_URL ||
        (process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : isProd
            ? 'https://tremfood.pt'
            : 'http://localhost:3000'),
    )
    .transform((v) => v.replace(/\/+$/, '')),
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

/** SMTP configurado? Sem SMTP os e-mails não saem. */
export const mailConfigured = Boolean(env.SMTP_HOST);

/** Links de verificação/reposição na resposta da API: só em desenvolvimento e
 *  sem SMTP. Em produção nunca — senão qualquer pessoa repunha a palavra-passe
 *  de qualquer conta (incluindo a do administrador). */
export const exposeDevLinks = !mailConfigured && !isProd;
