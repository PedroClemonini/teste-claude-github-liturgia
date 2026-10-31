/**
 * "Esqueci minha senha": gera um link de uso único, manda por e-mail e troca
 * a senha quando o link é aberto.
 *
 * Três cuidados moldam este arquivo:
 *
 * 1. O pedido responde igual exista ou não a conta, para a tela não virar um
 *    consultor de "quem é cadastrado aqui".
 * 2. A base do link vem do ambiente, nunca do cabeçalho Host da requisição —
 *    senão alguém poderia forjar um Host e receber um link de redefinição
 *    apontando para o próprio servidor.
 * 3. Trocar a senha invalida todos os pedidos pendentes daquela conta.
 */
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma.js';
import { sendMail } from '@/lib/mailer.js';
import { buildPasswordResetEmail } from '@/domain/auth/reset-email.js';
import {
  generateResetToken,
  hashResetToken,
  resetTokenExpiry,
  resetTokenState,
} from '@/domain/auth/reset-token.js';
import { requestPasswordResetSchema, resetPasswordSchema } from '@/domain/validation/schemas.js';
import { ValidationError, unwrap } from '@/domain/errors.js';

const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 10);

/** Intervalo mínimo entre dois e-mails para a mesma conta. */
const REENVIO_MINIMO_MS = 60 * 1000;

/** Base absoluta dos links do e-mail — só do ambiente (ver nota 2 acima). */
function appBaseUrl() {
  const raw = process.env.APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  if (!raw) {
    console.warn('[passwordReset] APP_URL/NEXTAUTH_URL ausente; usando http://localhost:3000');
    return 'http://localhost:3000';
  }
  return raw.replace(/\/+$/, '');
}

const MENSAGEM_NEUTRA =
  'Se este e-mail estiver cadastrado, enviamos um link para redefinir a senha. Confira também a caixa de spam.';

/**
 * Pede a redefinição. A resposta é sempre a mesma, exista a conta ou não.
 * @param {{email?: string}} input
 * @returns {Promise<{message: string}>}
 */
export async function requestPasswordReset(input) {
  const { email } = unwrap(requestPasswordResetSchema.safeParse(input));

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.info('[passwordReset] pedido para e-mail sem conta:', email);
    return { message: MENSAGEM_NEUTRA };
  }

  const agora = new Date();

  // Clique repetido no botão não deve render uma enxurrada de e-mails.
  const recente = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, usedAt: null, createdAt: { gt: new Date(agora.getTime() - REENVIO_MINIMO_MS) } },
  });
  if (recente) {
    console.info('[passwordReset] pedido repetido em menos de 1 min; nada reenviado para', email);
    return { message: MENSAGEM_NEUTRA };
  }

  // Um pedido novo aposenta os anteriores: só o último link funciona.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

  const token = generateResetToken();
  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashResetToken(token),
      userId: user.id,
      expiresAt: resetTokenExpiry(agora),
    },
  });

  const link = `${appBaseUrl()}/redefinir-senha?token=${encodeURIComponent(token)}`;
  const { subject, text, html } = buildPasswordResetEmail({ name: user.name, link });
  await sendMail({ to: user.email, subject, text, html });

  return { message: MENSAGEM_NEUTRA };
}

const ERRO_POR_ESTADO = {
  inexistente: 'Este link não é válido. Peça um novo e-mail de redefinição.',
  usado: 'Este link já foi usado. Peça um novo e-mail de redefinição.',
  expirado: 'Este link expirou. Peça um novo e-mail de redefinição.',
};

/**
 * Confere se um token ainda serve — usado pela página antes de mostrar o
 * formulário, para não deixar a pessoa digitar a senha em vão.
 * @param {string} token
 * @returns {Promise<{valid: boolean, reason?: string}>}
 */
export async function checkResetToken(token) {
  if (typeof token !== 'string' || !token.trim()) {
    return { valid: false, reason: ERRO_POR_ESTADO.inexistente };
  }
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
  });
  const state = resetTokenState(record);
  return state === 'valido' ? { valid: true } : { valid: false, reason: ERRO_POR_ESTADO[state] };
}

/**
 * Troca a senha a partir do token do e-mail.
 * @param {{token?: string, password?: string}} input
 * @returns {Promise<{message: string, email: string}>}
 */
export async function resetPassword(input) {
  const { token, password } = unwrap(resetPasswordSchema.safeParse(input));
  const tokenHash = hashResetToken(token);

  return prisma.$transaction(async (tx) => {
    const record = await tx.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true } } },
    });

    const state = resetTokenState(record);
    if (state !== 'valido') {
      throw new ValidationError(ERRO_POR_ESTADO[state], { token: ERRO_POR_ESTADO[state] });
    }

    // Marca o uso com a guarda usedAt:null: se dois envios chegarem juntos,
    // só o primeiro passa daqui.
    const consumido = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (consumido.count === 0) {
      throw new ValidationError(ERRO_POR_ESTADO.usado, { token: ERRO_POR_ESTADO.usado });
    }

    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash: await bcrypt.hash(password, SALT_ROUNDS) },
    });

    // Qualquer outro link pendente da mesma conta perde a validade.
    await tx.passwordResetToken.deleteMany({
      where: { userId: record.userId, usedAt: null },
    });

    return { message: 'Senha redefinida. Você já pode entrar.', email: record.user.email };
  });
}
