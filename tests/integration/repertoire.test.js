import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma, resetDatabase, makeCapela, makeCoordinator, makeMusician } from '../helpers/db.js';
import {
  setRepertoire,
  addRepertoireItem,
  removeRepertoireItem,
  performanceKey,
  buildScript,
} from '@/services/repertoire.js';
import { createSong } from '@/services/songs.js';
import { createCelebration } from '@/services/celebrations.js';

let capela;
let coordenador;
let musico;
let celebration;
let entrada;
let comunhao;

beforeEach(async () => {
  await resetDatabase();
  capela = await makeCapela();
  coordenador = await makeCoordinator({ capelaId: capela.id });
  musico = await makeMusician({ capelaId: capela.id });
  celebration = await createCelebration(
    { title: 'Missa dominical', date: '2026-04-05T10:00:00.000Z', type: 'MISSA_COMUM' },
    coordenador,
  );
  entrada = await createSong(
    { title: 'Eis-me aqui', chordPro: '[G]Eis-me aqui, [C]Senhor', originalKey: 'G' },
    coordenador,
  );
  comunhao = await createSong(
    { title: 'Pai Nosso', chordPro: '[C]Pai Nosso que est[G]ais no céu', originalKey: 'C' },
    coordenador,
  );
});
afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe('setRepertoire', () => {
  it('monta o roteiro musical da evento', async () => {
    const items = await setRepertoire(
      celebration.id,
      [
        { songId: comunhao.id, moment: 'COMUNHAO' },
        { songId: entrada.id, moment: 'ENTRADA' },
      ],
      coordenador,
    );
    expect(items.map((i) => i.moment)).toEqual(['ENTRADA', 'COMUNHAO']);
  });

  it('aceita duas músicas no mesmo momento em posições diferentes', async () => {
    const items = await setRepertoire(
      celebration.id,
      [
        { songId: entrada.id, moment: 'COMUNHAO', position: 0 },
        { songId: comunhao.id, moment: 'COMUNHAO', position: 1 },
      ],
      coordenador,
    );
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.position)).toEqual([0, 1]);
  });

  it('substitui o roteiro anterior por inteiro', async () => {
    await setRepertoire(celebration.id, [{ songId: entrada.id, moment: 'ENTRADA' }], coordenador);
    const items = await setRepertoire(
      celebration.id,
      [{ songId: comunhao.id, moment: 'FINAL' }],
      coordenador,
    );
    expect(items).toHaveLength(1);
    expect(items[0].moment).toBe('FINAL');
    expect(await prisma.repertoireItem.count()).toBe(1);
  });

  it('guarda o tom escolhido para a evento', async () => {
    const items = await setRepertoire(
      celebration.id,
      [{ songId: entrada.id, moment: 'ENTRADA', keyOverride: 'E' }],
      coordenador,
    );
    expect(items[0].keyOverride).toBe('E');
  });

  it('recusa música que não está no acervo, sem apagar o roteiro atual', async () => {
    await setRepertoire(celebration.id, [{ songId: entrada.id, moment: 'ENTRADA' }], coordenador);
    await expect(
      setRepertoire(celebration.id, [{ songId: 'inexistente', moment: 'SALMO' }], coordenador),
    ).rejects.toMatchObject({ status: 404 });
    expect(await prisma.repertoireItem.count()).toBe(1);
  });

  it('recusa duas músicas na mesma posição do mesmo momento', async () => {
    await expect(
      setRepertoire(
        celebration.id,
        [
          { songId: entrada.id, moment: 'ENTRADA', position: 0 },
          { songId: comunhao.id, moment: 'ENTRADA', position: 0 },
        ],
        coordenador,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('recusa momento fora do rito', async () => {
    await expect(
      setRepertoire(celebration.id, [{ songId: entrada.id, moment: 'CAFEZINHO' }], coordenador),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('avisa quando a evento não existe', async () => {
    await expect(
      setRepertoire('inexistente', [{ songId: entrada.id, moment: 'ENTRADA' }], coordenador),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('só o coordenador monta o roteiro', async () => {
    await expect(
      setRepertoire(celebration.id, [{ songId: entrada.id, moment: 'ENTRADA' }], musico),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe('addRepertoireItem e removeRepertoireItem', () => {
  it('acrescenta uma música ao roteiro existente', async () => {
    await setRepertoire(celebration.id, [{ songId: entrada.id, moment: 'ENTRADA' }], coordenador);
    const item = await addRepertoireItem(
      celebration.id,
      { songId: comunhao.id, moment: 'COMUNHAO' },
      coordenador,
    );
    expect(item.moment).toBe('COMUNHAO');
    expect(await prisma.repertoireItem.count()).toBe(2);
  });

  it('empilha na próxima posição livre quando o momento já tem música', async () => {
    await setRepertoire(celebration.id, [{ songId: entrada.id, moment: 'COMUNHAO' }], coordenador);
    const item = await addRepertoireItem(
      celebration.id,
      { songId: comunhao.id, moment: 'COMUNHAO' },
      coordenador,
    );
    expect(item.position).toBe(1);
  });

  it('remove um item do roteiro', async () => {
    const [item] = await setRepertoire(
      celebration.id,
      [{ songId: entrada.id, moment: 'ENTRADA' }],
      coordenador,
    );
    await removeRepertoireItem(item.id, coordenador);
    expect(await prisma.repertoireItem.count()).toBe(0);
  });

  it('só o coordenador altera o roteiro', async () => {
    const [item] = await setRepertoire(
      celebration.id,
      [{ songId: entrada.id, moment: 'ENTRADA' }],
      coordenador,
    );
    await expect(removeRepertoireItem(item.id, musico)).rejects.toMatchObject({ status: 403 });
  });

  it('coordenador de outra capela não mexe no roteiro', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const coordenadorDeFora = await makeCoordinator({ capelaId: outraCapela.id });

    await expect(
      setRepertoire(celebration.id, [{ songId: entrada.id, moment: 'ENTRADA' }], coordenadorDeFora),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      addRepertoireItem(celebration.id, { songId: entrada.id, moment: 'ENTRADA' }, coordenadorDeFora),
    ).rejects.toMatchObject({ status: 403 });

    const [item] = await setRepertoire(
      celebration.id,
      [{ songId: entrada.id, moment: 'ENTRADA' }],
      coordenador,
    );
    await expect(removeRepertoireItem(item.id, coordenadorDeFora)).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe('performanceKey', () => {
  it('usa o tom escolhido para a evento quando existe', () => {
    expect(performanceKey({ keyOverride: 'E', song: { originalKey: 'G' } })).toBe('E');
  });

  it('cai no tom original da cifra', () => {
    expect(performanceKey({ keyOverride: null, song: { originalKey: 'G' } })).toBe('G');
  });
});

describe('buildScript', () => {
  it('entrega o roteiro já com a cifra no tom da evento', async () => {
    await setRepertoire(
      celebration.id,
      [
        { songId: entrada.id, moment: 'ENTRADA', keyOverride: 'A' },
        { songId: comunhao.id, moment: 'COMUNHAO' },
      ],
      coordenador,
    );

    const script = await buildScript(celebration.id, musico);
    expect(script.map((i) => i.moment)).toEqual(['ENTRADA', 'COMUNHAO']);
    // Entrada estava em G e vai para A: dois semitons acima.
    expect(script[0].chordPro).toBe('[A]Eis-me aqui, [D]Senhor');
    expect(script[0].key).toBe('A');
    // Comunhão sem tom escolhido continua no tom original.
    expect(script[1].chordPro).toBe('[C]Pai Nosso que est[G]ais no céu');
    expect(script[1].key).toBe('C');
  });

  it('devolve também a cifra como foi cadastrada, para a tela do músico transpor a partir dela', async () => {
    await setRepertoire(
      celebration.id,
      [{ songId: entrada.id, moment: 'ENTRADA', keyOverride: 'A' }],
      coordenador,
    );

    const script = await buildScript(celebration.id, musico);
    // `chordPro` já vem no tom da evento (pronto para imprimir);
    // `sourceChordPro` é o texto original, no tom em que foi cadastrado.
    expect(script[0].chordPro).toBe('[A]Eis-me aqui, [D]Senhor');
    expect(script[0].sourceChordPro).toBe('[G]Eis-me aqui, [C]Senhor');
    expect(script[0].originalKey).toBe('G');
  });

  it('inclui título e momento legíveis para a tela do músico', async () => {
    await setRepertoire(celebration.id, [{ songId: entrada.id, moment: 'ACAO_DE_GRACAS' }], coordenador);
    const script = await buildScript(celebration.id, musico);
    expect(script[0]).toMatchObject({ title: 'Eis-me aqui', momentLabel: 'Ação de Graças' });
  });

  it('músico de outra capela não acessa o roteiro pronto', async () => {
    await setRepertoire(celebration.id, [{ songId: entrada.id, moment: 'ENTRADA' }], coordenador);
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const musicoDeFora = await makeMusician({ capelaId: outraCapela.id });

    await expect(buildScript(celebration.id, musicoDeFora)).rejects.toMatchObject({ status: 404 });
  });

  it('músico de outra capela acessa o roteiro pronto se foi escalado como participante', async () => {
    await setRepertoire(celebration.id, [{ songId: entrada.id, moment: 'ENTRADA' }], coordenador);
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const visitante = await makeMusician({ capelaId: outraCapela.id });
    await prisma.celebration.update({
      where: { id: celebration.id },
      data: { participants: { connect: { id: visitante.id } } },
    });

    const script = await buildScript(celebration.id, visitante);
    expect(script[0].title).toBe('Eis-me aqui');
  });

  it('coordenador de outra capela vê o roteiro pronto (mas não edita o roteiro)', async () => {
    await setRepertoire(celebration.id, [{ songId: entrada.id, moment: 'ENTRADA' }], coordenador);
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const coordenadorDeFora = await makeCoordinator({ capelaId: outraCapela.id });

    const script = await buildScript(celebration.id, coordenadorDeFora);
    expect(script[0].title).toBe('Eis-me aqui');

    await expect(
      setRepertoire(celebration.id, [{ songId: comunhao.id, moment: 'COMUNHAO' }], coordenadorDeFora),
    ).rejects.toMatchObject({ status: 403 });
  });
});
