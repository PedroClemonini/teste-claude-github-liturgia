/**
 * Envio de e-mail por SMTP.
 *
 * As credenciais vêm do ambiente, então serve qualquer provedor (o do
 * domínio da paróquia, Gmail com senha de app, etc.). Sem SMTP configurado,
 * nada é enviado: a mensagem vai para o log do servidor, o que mantém o
 * ambiente de desenvolvimento usável sem credenciais reais.
 */
import nodemailer from 'nodemailer';

const REMETENTE_PADRAO = 'Coral Litúrgico <suporte@paroquiasfranciscoxavier.com.br>';

/** @returns {import('nodemailer').TransportOptions|null} null = SMTP não configurado */
function readSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);
  return {
    host,
    port,
    // 465 é TLS desde o início; 587 começa em texto puro e sobe com STARTTLS.
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
    auth: { user, pass },
  };
}

export function isMailConfigured() {
  return readSmtpConfig() !== null;
}

// O transporte mantém um pool de conexões, por isso é criado uma vez só.
let transport = null;
function getTransport(config) {
  if (!transport) transport = nodemailer.createTransport(config);
  return transport;
}

/**
 * Envia um e-mail. Nunca lança: quem chama decide o que dizer ao usuário.
 * @param {{to: string, subject: string, text: string, html?: string}} message
 * @returns {Promise<{delivered: boolean, reason?: string}>}
 */
export async function sendMail({ to, subject, text, html }) {
  const config = readSmtpConfig();
  if (!config) {
    console.warn(
      `[mailer] SMTP não configurado — e-mail para ${to} não enviado.\n` +
        `Assunto: ${subject}\n${text}`,
    );
    return { delivered: false, reason: 'smtp_nao_configurado' };
  }

  try {
    await getTransport(config).sendMail({
      from: process.env.MAIL_FROM?.trim() || REMETENTE_PADRAO,
      to,
      subject,
      text,
      ...(html ? { html } : {}),
    });
    return { delivered: true };
  } catch (error) {
    console.error('[mailer] falha ao enviar e-mail para', to, error);
    return { delivered: false, reason: 'falha_no_envio' };
  }
}
