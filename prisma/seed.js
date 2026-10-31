/**
 * Dados de exemplo para começar a usar o sistema.
 *
 * Traz duas contas (coordenador e músico), um punhado de cantos com texto
 * litúrgico ou de domínio público e algumas celebrações já com roteiro, o
 * bastante para navegar por todas as telas.
 *
 * Uso: npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SENHA_PADRAO = '@Coral2026';


async function main() {
  console.log('Limpando dados anteriores…');
  await prisma.repertoireItem.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.celebration.deleteMany();
  await prisma.song.deleteMany();
  await prisma.user.deleteMany();
  await prisma.capela.deleteMany();

  const passwordHash = await bcrypt.hash(SENHA_PADRAO, 10);

  // O Administrador não pertence a nenhuma capela: funda capelas e concede
  // coordenações, mas não opera agenda/acervo diretamente.
  await prisma.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@paroquia.org',
      passwordHash,
      voiceOrInstrument: 'Administração',
      role: 'ADMINISTRADOR',
    },
  });

  const capela = await prisma.capela.create({ data: { name: 'Paróquia Matriz' } });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
