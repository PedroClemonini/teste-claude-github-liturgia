import { prisma } from '@/lib/prisma.js';

/** Limpa as tabelas na ordem das dependências, entre um teste e outro. */
export async function resetDatabase() {
  await prisma.repertoireItem.deleteMany();
  await prisma.celebration.deleteMany();
  await prisma.song.deleteMany();
  await prisma.user.deleteMany();
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

export { prisma };
