/**
 * Texto do e-mail de redefinição de senha. Função pura, separada do envio,
 * para poder ser conferida em teste sem SMTP.
 */
import { RESET_TTL_MINUTES } from './reset-token.js';

/** Escapa o que entra no HTML — o nome vem do cadastro, digitado por pessoa. */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {{name: string, link: string}} params
 * @returns {{subject: string, text: string, html: string}}
 */
export function buildPasswordResetEmail({ name, link }) {
  const primeiroNome = String(name ?? '').trim().split(/\s+/)[0] || 'olá';
  const validade = `${RESET_TTL_MINUTES} minutos`;

  const text = [
    `Olá, ${primeiroNome}.`,
    '',
    'Recebemos um pedido para redefinir a senha da sua conta no Coral Litúrgico.',
    'Abra o link abaixo para escolher uma senha nova:',
    '',
    link,
    '',
    `O link vale por ${validade} e só pode ser usado uma vez.`,
    'Se não foi você que pediu, ignore este e-mail: sua senha atual continua valendo.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#faf8f4;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#21201d;">
    <div style="max-width:32rem;margin:0 auto;background:#fff;border:1px solid #e7e1d6;border-radius:12px;padding:24px;">
      <h1 style="margin:0 0 16px;font-size:1.25rem;">Redefinir sua senha</h1>
      <p style="margin:0 0 12px;line-height:1.5;">Olá, ${escapeHtml(primeiroNome)}.</p>
      <p style="margin:0 0 20px;line-height:1.5;">
        Recebemos um pedido para redefinir a senha da sua conta no
        <strong>Coral Litúrgico</strong>. Clique no botão para escolher uma senha nova.
      </p>
      <p style="margin:0 0 20px;">
        <a href="${escapeHtml(link)}"
           style="display:inline-block;background:#6b4f2a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
          Escolher nova senha
        </a>
      </p>
      <p style="margin:0 0 12px;font-size:0.85rem;color:#6b6760;line-height:1.5;">
        Se o botão não funcionar, copie e cole este endereço no navegador:<br />
        <span style="word-break:break-all;">${escapeHtml(link)}</span>
      </p>
      <p style="margin:0;font-size:0.85rem;color:#6b6760;line-height:1.5;">
        O link vale por ${validade} e só pode ser usado uma vez. Se não foi você
        que pediu, ignore este e-mail: sua senha atual continua valendo.
      </p>
    </div>
  </body>
</html>`;

  return { subject: 'Redefinir sua senha · Coral Litúrgico', text, html };
}
