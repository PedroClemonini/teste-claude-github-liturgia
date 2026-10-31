/**
 * Convites de cadastro: um link/token por capela, gerado pelo coordenador.
 * Não há envio de e-mail — o coordenador copia e compartilha o link.
 */
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma.js';
import { assertManagesCapela } from '@/domain/auth/roles.js';
import { getCapela } from '@/services/capelas.js';
import { NotFoundError, ValidationError } from '@/domain/errors.js';

const INVITE_TTL_DAYS = 7;

export async function createInvite(capelaId, actor) {
  const capela = await getCapela(capelaId);
  assertManagesCapela(actor, capela);

  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  return prisma.invite.create({
    data: { token: randomUUID(), capelaId: capela.id, createdById: actor.id, expiresAt },
  });
}

export async function listInvites(capelaId, actor) {
  const capela = await getCapela(capelaId);
  assertManagesCapela(actor, capela);

  return prisma.invite.findMany({ where: { capelaId: capela.id }, orderBy: { createdAt: 'desc' } });
}

export async function revokeInvite(id, actor) {
  const invite = await prisma.invite.findUnique({ where: { id } });
  if (!invite) throw new NotFoundError('Convite não encontrado.');

  const capela = await getCapela(invite.capelaId);
  assertManagesCapela(actor, capela);

  // deleteMany não reclama se o convite já sumiu (clique duplo em "Revogar").
  await prisma.invite.deleteMany({ where: { id } });
  return { id };
}

/**
 * Confere se um token de convite ainda vale a pena ser usado. Aceita um
 * client/transação opcional para ser chamada de dentro de `registerUser`.
 * @param {string} token
 * @param {import('@prisma/client').PrismaClient} [client]
 */
export async function validateInviteToken(token, client = prisma) {
  if (typeof token !== 'string' || !token.trim()) {
    throw new ValidationError('Convite obrigatório.', {
      inviteToken: 'Informe um link de convite válido.',
    });
  }

  const invite = await client.invite.findUnique({ where: { token } });
  if (!invite) {
    throw new ValidationError('Convite inválido.', {
      inviteToken: 'Este convite não existe ou já foi usado.',
    });
  }
  if (invite.usedAt) {
    throw new ValidationError('Convite já utilizado.', {
      inviteToken: 'Este convite já foi usado. Peça um novo link.',
    });
  }
  if (invite.expiresAt < new Date()) {
    throw new ValidationError('Convite expirado.', {
      inviteToken: 'Este convite expirou. Peça um novo link.',
    });
  }
  return invite;
}
