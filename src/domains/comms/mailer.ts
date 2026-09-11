import nodemailer from 'nodemailer';
import { env } from '@/infra/config';
import { log } from '@/infra/logging';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export async function sendMail(to: string, subject: string, html: string, text: string) {
  const t = getTransporter();
  if (!t) {
    // Sem SMTP configurado: em desenvolvimento registamos o conteúdo no log
    // (produção exige SMTP — a aplicação recusa silenciosamente e avisa o operador).
    log('warn', 'mail.smtp.unconfigured', { to, subject });
    return { sent: false as const, reason: 'SMTP_NOT_CONFIGURED' };
  }
  try {
    await t.sendMail({ from: env.MAIL_FROM, to, subject, html, text });
    return { sent: true as const };
  } catch (e) {
    log('error', 'mail.send.failed', { to, subject, error: (e as Error).message });
    return { sent: false as const, reason: 'SEND_FAILED' };
  }
}

export function verifyEmailHtml(link: string) {
  return `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <h2 style="color:#1C1A16;margin:0 0 12px">Confirme o seu e-mail</h2>
    <p style="color:#444;line-height:1.6">Bem-vindo ao Trem Food. Para ativar a sua conta, confirme o seu endereço de e-mail clicando no botão abaixo.</p>
    <p style="margin:24px 0"><a href="${link}" style="background:#E9A400;color:#221800;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">Confirmar e-mail</a></p>
    <p style="color:#888;font-size:13px">Este link é válido por 24 horas. Se não foi você, ignore esta mensagem.</p>
  </div>`;
}

export function resetPasswordHtml(link: string) {
  return `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <h2 style="color:#1C1A16;margin:0 0 12px">Redefinir palavra-passe</h2>
    <p style="color:#444;line-height:1.6">Recebemos um pedido para redefinir a palavra-passe da sua conta Trem Food.</p>
    <p style="margin:24px 0"><a href="${link}" style="background:#E9A400;color:#221800;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">Redefinir palavra-passe</a></p>
    <p style="color:#888;font-size:13px">Este link é válido por 1 hora. Se não foi você, ignore esta mensagem.</p>
  </div>`;
}

export function orderConfirmationHtml(number: string, totalLabel: string, paymentLabel: string) {
  return `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <h2 style="color:#1C1A16;margin:0 0 12px">Pedido ${number} confirmado</h2>
    <p style="color:#444;line-height:1.6">O seu pedido foi recebido e já está em preparação.</p>
    <p style="background:#F6F3EC;border-radius:10px;padding:14px;margin:20px 0">
      <strong>Total:</strong> ${totalLabel}<br/><strong>Pagamento:</strong> ${paymentLabel}
    </p>
    <p style="color:#888;font-size:13px">Pode acompanhar o estado do pedido na página de acompanhamento.</p>
  </div>`;
}
