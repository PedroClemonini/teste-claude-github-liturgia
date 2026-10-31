import { prisma } from '@/lib/prisma.js';

/** Limpa as tabelas na ordem das dependências, entre um teste e outro. */
export async function resetDatabase() {
  await prisma.repertoireItem.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.celebration.deleteMany();
  await prisma.song.deleteMany();
  await prisma.user.deleteMany();
  await prisma.capela.deleteMany();
}

export async function makeCapela(overrides = {}) {
  return prisma.capela.create({
    data: { name: 'Paróquia de Teste', ...overrides },
  });
}

export async function makeCoordinator(overrides = {}) {
  return prisma.user.create({
    data: {
      name: 'Ana Coordenadora',
      email: `ana-${Math.random().toString(36).slice(2, 8)}@paroquia.org`,
      passwordHash: 'hash',
      voiceOrInstrument: 'Violão',
      role: 'COORDENADOR',
      ...overrides,
    },
  });
}

export async function makeMusician(overrides = {}) {
  return prisma.user.create({
    data: {
      name: 'João Músico',
      email: `joao-${Math.random().toString(36).slice(2, 8)}@paroquia.org`,
      passwordHash: 'hash',
      voiceOrInstrument: 'Tenor',
      role: 'MUSICO',
      ...overrides,
    },
  });
}

/** Administrador não pertence a nenhuma capela por padrão. */
export async function makeAdministrator(overrides = {}) {
  return prisma.user.create({
    data: {
      name: 'Zeca Administrador',
      email: `zeca-${Math.random().toString(36).slice(2, 8)}@paroquia.org`,
      passwordHash: 'hash',
      voiceOrInstrument: 'Administração',
      role: 'ADMINISTRADOR',
      ...overrides,
    },
  });
}

export { prisma };
