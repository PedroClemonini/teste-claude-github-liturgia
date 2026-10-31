/**
 * Capelas: agrupam membros e celebrações sob um mesmo coordenador.
 */
import { prisma } from '@/lib/prisma.js';
import { capelaSchema } from '@/domain/validation/schemas.js';
import { ACTIONS, AuthorizationError, assertCan, isAdministrator, isCoordinator } from '@/domain/auth/roles.js';
import { NotFoundError, unwrap } from '@/domain/errors.js';

/** Só o administrador funda capelas novas. */
export async function createCapela(input, actor) {
  assertCan(actor, ACTIONS.MANAGE_CAPELA);
  const data = unwrap(capelaSchema.safeParse(input));
  return prisma.capela.create({ data: { name: data.name, createdById: actor.id } });
}

/**
 * Capelas que o ator administra: para o administrador, todas; para o
 * coordenador, só a própria capela-casa.
 */
export async function listManagedCapelas(actor) {
  if (!actor?.role) {
    throw new AuthorizationError('É preciso entrar para continuar.', { status: 401 });
  }
  if (isAdministrator(actor)) {
    return prisma.capela.findMany({ orderBy: { name: 'asc' } });
  }
  if (!isCoordinator(actor)) {
    throw new AuthorizationError('Esta ação é exclusiva do coordenador ou do administrador.', {
      status: 403,
    });
  }
  if (!actor.capelaId) return [];

  const capela = await prisma.capela.findUnique({ where: { id: actor.capelaId } });
  return capela ? [capela] : [];
}

export async function getCapela(id) {
  const capela = id ? await prisma.capela.findUnique({ where: { id } }) : null;
  if (!capela) throw new NotFoundError('Capela não encontrada.');
  return capela;
}
