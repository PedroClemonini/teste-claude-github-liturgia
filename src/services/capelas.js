/**
 * Capelas: agrupam membros e celebrações.
 */
import { prisma } from '@/lib/prisma.js';
import { capelaSchema } from '@/domain/validation/schemas.js';
import { ACTIONS, AuthorizationError, assertCan, isCoordinator, isOwner } from '@/domain/auth/roles.js';
import { NotFoundError, unwrap } from '@/domain/errors.js';

/** Só o dono cria capelas novas. */
export async function createCapela(input, actor) {
  assertCan(actor, ACTIONS.MANAGE_CAPELA);
  const data = unwrap(capelaSchema.safeParse(input));
  return prisma.capela.create({ data: { name: data.name, createdById: actor.id } });
}

/**
 * Capelas que o ator administra: para o dono, todas; para o coordenador, as
 * que ele coordena.
 */
export async function listManagedCapelas(actor) {
  if (!actor?.role) {
    throw new AuthorizationError('É preciso entrar para continuar.', { status: 401 });
  }
  if (isOwner(actor)) {
    return prisma.capela.findMany({ orderBy: { name: 'asc' } });
  }
  if (!isCoordinator(actor)) {
    throw new AuthorizationError('Esta ação é exclusiva do coordenador.', { status: 403 });
  }
  return prisma.capela.findMany({
    where: { memberships: { some: { userId: actor.id, role: 'COORDENADOR' } } },
    orderBy: { name: 'asc' },
  });
}

export async function getCapela(id) {
  const capela = id ? await prisma.capela.findUnique({ where: { id } }) : null;
  if (!capela) throw new NotFoundError('Capela não encontrada.');
  return capela;
}
