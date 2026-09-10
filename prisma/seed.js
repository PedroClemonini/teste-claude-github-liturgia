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

const SENHA_PADRAO = 'coral2026';

const MUSICAS = [
  {
    title: 'Eis-me aqui, Senhor',
    composer: 'Tradicional',
    originalKey: 'G',
    moments: ['ENTRADA'],
    seasons: [],
    chordPro: `{title: Eis-me aqui, Senhor}
{key: G}
{c: Refrão}
{soc}
[G]Eis-me aqui, Se[C]nhor,
[D]eis-me aqui, Se[G]nhor,
[Em]para fazer tua von[C]tade,
[D]para fazer tua von[G]tade.
{eoc}

{c: Estrofe}
[G]Tu me sondas, me co[C]nheces,
[D]sabes tudo sobre [G]mim.`,
  },
  {
    title: 'Senhor, tende piedade',
    composer: 'Texto litúrgico',
    originalKey: 'Am',
    moments: ['ATO_PENITENCIAL'],
    seasons: [],
    chordPro: `{title: Senhor, tende piedade}
{key: Am}
[Am]Senhor, tende piedade de [Dm]nós,
[E7]Senhor, tende piedade de [Am]nós.
[Am]Cristo, tende piedade de [Dm]nós,
[E7]Cristo, tende piedade de [Am]nós.`,
  },
  {
    title: 'Glória a Deus nas alturas',
    composer: 'Texto litúrgico',
    originalKey: 'D',
    moments: ['GLORIA'],
    seasons: ['NATAL', 'PASCOA', 'TEMPO_COMUM'],
    chordPro: `{title: Glória a Deus nas alturas}
{key: D}
{soc}
[D]Glória a Deus nas al[G]turas
[A7]e paz na terra aos homens por Ele a[D]mados!
{eoc}

[D]Senhor Deus, Rei dos [Bm]céus,
[G]Deus Pai todo-pode[A7]roso,
[D]nós vos louvamos, nós vos bendi[A7]zemos,
nós vos adora[D]mos.`,
  },
  {
    title: 'Santo, Santo, Santo',
    composer: 'Texto litúrgico',
    originalKey: 'C',
    moments: ['SANTO'],
    seasons: [],
    chordPro: `{title: Santo, Santo, Santo}
{key: C}
[C]Santo, San[F]to, San[C]to,
Senhor Deus do univer[G]so!
[C]O céu e a terra proclamam a vossa [F]glória.
[G]Hosana, hosana nas al[C]turas!`,
  },
  {
    title: 'Cordeiro de Deus',
    composer: 'Texto litúrgico',
    originalKey: 'F',
    moments: ['CORDEIRO'],
    seasons: [],
    chordPro: `{title: Cordeiro de Deus}
{key: F}
[F]Cordeiro de Deus, que tirais o pecado do [Bb]mundo,
[C7]tende piedade de [F]nós.
[F]Cordeiro de Deus, que tirais o pecado do [Bb]mundo,
[C7]dai-nos a [F]paz.`,
  },
  {
    title: 'Pai Nosso',
    composer: 'Texto litúrgico',
    originalKey: 'G',
    moments: ['COMUNHAO'],
    seasons: [],
    chordPro: `{title: Pai Nosso}
{key: G}
[G]Pai Nosso que est[C]ais no c[G]éu,
santificado seja o vosso [D]nome.
[G]Venha a nós o vosso [C]Reino,
seja feita a vossa von[D]tade,
assim na terra como no [G]céu.`,
  },
  {
    title: 'Noite Feliz',
    composer: 'Franz Xaver Gruber (domínio público)',
    originalKey: 'C',
    moments: ['ENTRADA', 'COMUNHAO'],
    seasons: ['NATAL'],
    chordPro: `{title: Noite Feliz}
{key: C}
[C]Noite feliz, noite fe[G7]liz!
[C]Ó Senhor, Deus de a[F]mor,
[C]pobrezinho nasceu em Be[G7]lém,
[C]eis na lapa Jesus nosso [F]bem.
[C]Dorme em paz, ó Je[G7]sus,
[C]dorme em paz, ó Je[F]sus.`,
  },
  {
    title: 'Aleluia, aleluia',
    composer: 'Tradicional',
    originalKey: 'D',
    moments: ['ACLAMACAO'],
    seasons: ['PASCOA', 'TEMPO_COMUM'],
    chordPro: `{title: Aleluia, aleluia}
{key: D}
[D]Aleluia, alelu[A]ia,
[G]aleluia, alelu[D]ia!`,
  },
  {
    title: 'Recebe, ó Deus',
    composer: 'Tradicional',
    originalKey: 'E',
    moments: ['OFERTORIO'],
    seasons: [],
    chordPro: `{title: Recebe, ó Deus}
{key: E}
[E]Recebe, ó Deus, o pão e o [A]vinho,
[B7]fruto do nosso tra[E]balho.
[E]Recebe, ó Deus, a nossa [A]vida,
[B7]tudo o que somos e te[E]mos.`,
  },
  {
    title: 'Ide em paz',
    composer: 'Tradicional',
    originalKey: 'A',
    moments: ['FINAL'],
    seasons: [],
    chordPro: `{title: Ide em paz}
{key: A}
[A]Ide em paz, o Senhor vos a[D]companha,
[E7]levai a todos a Boa-No[A]va.`,
  },
];

async function main() {
  console.log('Limpando dados anteriores…');
  await prisma.repertoireItem.deleteMany();
  await prisma.celebration.deleteMany();
  await prisma.song.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(SENHA_PADRAO, 10);

  const coordenador = await prisma.user.create({
    data: {
      name: 'Ana Coordenadora',
      email: 'coordenador@paroquia.org',
      passwordHash,
      voiceOrInstrument: 'Violão',
      role: 'COORDENADOR',
    },
  });

  await prisma.user.createMany({
    data: [
      {
        name: 'João Tenor',
        email: 'musico@paroquia.org',
        passwordHash,
        voiceOrInstrument: 'Tenor',
        role: 'MUSICO',
      },
      {
        name: 'Clara Soprano',
        email: 'clara@paroquia.org',
        passwordHash,
        voiceOrInstrument: 'Soprano',
        role: 'MUSICO',
      },
      {
        name: 'Pedro Teclado',
        email: 'pedro@paroquia.org',
        passwordHash,
        voiceOrInstrument: 'Teclado',
        role: 'MUSICO',
      },
    ],
  });

  // As funções de domínio ficam disponíveis via import dinâmico para que o
  // seed use exatamente as mesmas regras da aplicação.
  const { extractPlainLyrics } = await import('../src/domain/chordpro/parse.js');
  const { seasonForDate } = await import('../src/domain/liturgy/seasons.js');

  const songs = {};
  for (const musica of MUSICAS) {
    const song = await prisma.song.create({
      data: {
        ...musica,
        plainLyrics: extractPlainLyrics(musica.chordPro),
        createdById: coordenador.id,
      },
    });
    songs[song.title] = song;
  }
  console.log(`${MUSICAS.length} músicas cadastradas.`);

  const hoje = new Date();
  const proximoDomingo = new Date(hoje);
  proximoDomingo.setUTCDate(hoje.getUTCDate() + ((7 - hoje.getUTCDay()) % 7 || 7));
  proximoDomingo.setUTCHours(10, 0, 0, 0);

  const quinta = new Date(proximoDomingo);
  quinta.setUTCDate(proximoDomingo.getUTCDate() - 3);
  quinta.setUTCHours(20, 0, 0, 0);

  const sabado = new Date(proximoDomingo);
  sabado.setUTCDate(proximoDomingo.getUTCDate() + 6);
  sabado.setUTCHours(16, 0, 0, 0);

  const criarCelebracao = (title, date, type, extras = {}) =>
    prisma.celebration.create({
      data: {
        title,
        date,
        type,
        season: seasonForDate(date),
        createdById: coordenador.id,
        ...extras,
      },
    });

  const ensaio = await criarCelebracao('Ensaio geral', quinta, 'ENSAIO', {
    location: 'Salão paroquial',
    notes: 'Revisar o Glória e a aclamação.',
  });
  const missa = await criarCelebracao('Missa dominical', proximoDomingo, 'MISSA_COMUM', {
    location: 'Igreja Matriz',
  });
  const casamento = await criarCelebracao('Casamento Ana e Pedro', sabado, 'MISSA_SOLENE', {
    location: 'Igreja Matriz',
    notes: 'Entrada da noiva instrumental; coral completo.',
  });

  await prisma.repertoireItem.createMany({
    data: [
      { celebrationId: missa.id, songId: songs['Eis-me aqui, Senhor'].id, moment: 'ENTRADA' },
      { celebrationId: missa.id, songId: songs['Senhor, tende piedade'].id, moment: 'ATO_PENITENCIAL' },
      { celebrationId: missa.id, songId: songs['Glória a Deus nas alturas'].id, moment: 'GLORIA' },
      { celebrationId: missa.id, songId: songs['Aleluia, aleluia'].id, moment: 'ACLAMACAO' },
      { celebrationId: missa.id, songId: songs['Recebe, ó Deus'].id, moment: 'OFERTORIO', keyOverride: 'D' },
      { celebrationId: missa.id, songId: songs['Santo, Santo, Santo'].id, moment: 'SANTO' },
      { celebrationId: missa.id, songId: songs['Cordeiro de Deus'].id, moment: 'CORDEIRO' },
      { celebrationId: missa.id, songId: songs['Pai Nosso'].id, moment: 'COMUNHAO' },
      { celebrationId: missa.id, songId: songs['Ide em paz'].id, moment: 'FINAL' },

      { celebrationId: casamento.id, songId: songs['Glória a Deus nas alturas'].id, moment: 'GLORIA' },
      { celebrationId: casamento.id, songId: songs['Santo, Santo, Santo'].id, moment: 'SANTO', keyOverride: 'D' },
      { celebrationId: casamento.id, songId: songs['Pai Nosso'].id, moment: 'COMUNHAO' },

      { celebrationId: ensaio.id, songId: songs['Glória a Deus nas alturas'].id, moment: 'GLORIA' },
      { celebrationId: ensaio.id, songId: songs['Aleluia, aleluia'].id, moment: 'ACLAMACAO' },
    ],
  });

  console.log('Celebrações e roteiros criados.');
  console.log('');
  console.log('Contas de exemplo (senha: %s):', SENHA_PADRAO);
  console.log('  coordenador@paroquia.org  (Coordenador)');
  console.log('  musico@paroquia.org       (Músico)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
