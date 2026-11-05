import { prisma } from '@/lib/prisma.js';
import { toActor } from '@/domain/auth/roles.js';

/** Limpa as tabelas na ordem das dependências, entre um teste e outro. */
export async function resetDatabase() {
  await prisma.liturgyDay.deleteMany();
  await prisma.repertoireItem.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.celebration.deleteMany();
  await prisma.song.deleteMany();
  await prisma.capelaMembership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.capela.deleteMany();
}

export async function makeCapela(overrides = {}) {
  return prisma.capela.create({
    data: { name: 'Paróquia de Teste', ...overrides },
  });
}

const WITH_MEMBERSHIPS = {
  memberships: { include: { capela: { select: { id: true, name: true } } } },
};

const randomEmail = (name) => `${name}-${Math.random().toString(36).slice(2, 8)}@paroquia.org`;

/**
 * Cria um usuário já com os vínculos e o devolve como ator, igual ao que
 * `currentUser` entrega às rotas. `capelaId` é atalho para uma única capela;
 * o papel do vínculo é `role`.
 */
async function makeUser({ capelaId, role, memberships, ...data }) {
  const vinculos = memberships ?? (capelaId ? [{ capelaId, role }] : []);
  const user = await prisma.user.create({
    data: {
      passwordHash: 'hash',
      ...data,
      memberships: { create: vinculos },
    },
    include: WITH_MEMBERSHIPS,
  });
  return { ...toActor(user), capelaId };
}

export async function makeCoordinator(overrides = {}) {
  return makeUser({
    name: 'Ana Coordenadora',
    email: randomEmail('ana'),
    instruments: ['Violão'],
    role: 'COORDENADOR',
    ...overrides,
  });
}

export async function makeMusician(overrides = {}) {
  return makeUser({
    name: 'João Músico',
    email: randomEmail('joao'),
    instruments: ['Tenor'],
    role: 'MUSICO',
    ...overrides,
  });
}

/** O dono não precisa de vínculo com nenhuma capela. */
export async function makeOwner(overrides = {}) {
  return makeUser({
    name: 'Zeca Dono',
    email: randomEmail('zeca'),
    isOwner: true,
    ...overrides,
  });
}

/** Ator atualizado do banco, depois de uma mudança de vínculo. */
export async function reloadActor(id) {
  return toActor(await prisma.user.findUnique({ where: { id }, include: WITH_MEMBERSHIPS }));
}

export { prisma };
