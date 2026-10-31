import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma, resetDatabase, makeCapela, makeCoordinator, makeMusician } from '../helpers/db.js';
import {
  createCelebration,
  updateCelebration,
  deleteCelebration,
  listCelebrations,
  getCelebration,
  nextCelebrations,
  listCelebrationCapelas,
} from '@/services/celebrations.js';
import { createSong } from '@/services/songs.js';
import { setRepertoire } from '@/services/repertoire.js';

let capela;
let coordenador;
let musico;

beforeEach(async () => {
  await resetDatabase();
  capela = await makeCapela();
  coordenador = await makeCoordinator({ capelaId: capela.id });
  musico = await makeMusician({ capelaId: capela.id });
});
afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

const missa = {
  title: 'Missa dominical',
  date: '2026-04-05T10:00:00.000Z',
  type: 'MISSA_COMUM',
};

describe('createCelebration', () => {
  it('grava a evento deduzindo o tempo litúrgico da data', async () => {
    const celebration = await createCelebration(missa, coordenador);
    expect(celebration.season).toBe('PASCOA');
    expect(celebration.date.toISOString()).toBe('2026-04-05T10:00:00.000Z');
    expect(celebration.createdById).toBe(coordenador.id);
  });

  it('aceita missa solene e ensaio', async () => {
    const casamento = await createCelebration(
      { ...missa, title: 'Casamento Ana e Pedro', type: 'MISSA_SOLENE' },
      coordenador,
    );
    const ensaio = await createCelebration(
      { ...missa, title: 'Ensaio geral', type: 'ENSAIO' },
      coordenador,
    );
    expect(casamento.type).toBe('MISSA_SOLENE');
    expect(ensaio.type).toBe('ENSAIO');
  });

  it('só o coordenador edita o calendário', async () => {
    await expect(createCelebration(missa, musico)).rejects.toMatchObject({ status: 403 });
    await expect(createCelebration(missa, null)).rejects.toMatchObject({ status: 401 });
  });

  it('recusa data inválida', async () => {
    await expect(
      createCelebration({ ...missa, date: 'domingo que vem' }, coordenador),
    ).rejects.toMatchObject({ status: 422 });
  });
});

describe('updateCelebration', () => {
  it('recalcula o tempo litúrgico quando a data muda', async () => {
    const celebration = await createCelebration(missa, coordenador);
    const updated = await updateCelebration(
      celebration.id,
      { ...missa, date: '2026-12-25T20:00:00.000Z' },
      coordenador,
    );
    expect(updated.season).toBe('NATAL');
  });

  it('mantém o tempo escolhido à mão pelo coordenador', async () => {
    const celebration = await createCelebration(missa, coordenador);
    const updated = await updateCelebration(
      celebration.id,
      { ...missa, season: 'TEMPO_COMUM' },
      coordenador,
    );
    expect(updated.season).toBe('TEMPO_COMUM');
  });

  it('avisa quando a evento não existe', async () => {
    await expect(updateCelebration('inexistente', missa, coordenador)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('listCelebrations', () => {
  beforeEach(async () => {
    await createCelebration({ ...missa, title: 'Missa de fevereiro', date: '2026-02-01T10:00:00.000Z' }, coordenador);
    await createCelebration({ ...missa, title: 'Ensaio de março', date: '2026-03-10T20:00:00.000Z', type: 'ENSAIO' }, coordenador);
    await createCelebration({ ...missa, title: 'Páscoa', date: '2026-04-05T10:00:00.000Z', type: 'MISSA_SOLENE' }, coordenador);
  });

  it('lista em ordem cronológica', async () => {
    const list = await listCelebrations({}, musico);
    expect(list.map((c) => c.title)).toEqual(['Missa de fevereiro', 'Ensaio de março', 'Páscoa']);
  });

  it('filtra por intervalo de datas do mês exibido na agenda', async () => {
    const list = await listCelebrations(
      { from: '2026-03-01T00:00:00.000Z', to: '2026-03-31T23:59:59.999Z' },
      musico,
    );
    expect(list.map((c) => c.title)).toEqual(['Ensaio de março']);
  });

  it('filtra por tipo de evento', async () => {
    const list = await listCelebrations({ type: 'ENSAIO' }, musico);
    expect(list.map((c) => c.title)).toEqual(['Ensaio de março']);
  });

  it('conta o roteiro de cada evento', async () => {
    const song = await createSong(
      { title: 'Aleluia', chordPro: '[C]Aleluia', originalKey: 'C' },
      coordenador,
    );
    const [fevereiro] = await listCelebrations({ type: 'MISSA_COMUM' }, musico);
    await setRepertoire(fevereiro.id, [{ songId: song.id, moment: 'ENTRADA' }], coordenador);

    const list = await listCelebrations({ type: 'MISSA_COMUM' }, musico);
    expect(list[0].songCount).toBe(1);
  });

  it('exige autenticação para ver a agenda', async () => {
    await expect(listCelebrations({}, null)).rejects.toMatchObject({ status: 401 });
  });

  it('coordenador filtra por qualquer capela — vê de todas, uma de cada vez', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const coordenadorDeFora = await makeCoordinator({ capelaId: outraCapela.id });
    await createCelebration({ ...missa, title: 'Missa de lá' }, coordenadorDeFora);

    const daPropria = await listCelebrations({ capelaId: capela.id }, coordenador);
    expect(daPropria.map((c) => c.title)).not.toContain('Missa de lá');

    const daOutra = await listCelebrations({ capelaId: outraCapela.id }, coordenador);
    expect(daOutra.map((c) => c.title)).toEqual(['Missa de lá']);
  });

  it('músico não filtra por capela alheia — só vê a própria e onde participa', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const coordenadorDeFora = await makeCoordinator({ capelaId: outraCapela.id });
    await createCelebration({ ...missa, title: 'Missa de lá' }, coordenadorDeFora);

    // O filtro de capela é exclusivo do coordenador; se o músico mandar um
    // capelaId mesmo assim, ele é ignorado — a visibilidade dele nunca muda.
    const list = await listCelebrations({ capelaId: outraCapela.id }, musico);
    expect(list.map((c) => c.title)).not.toContain('Missa de lá');
  });
});

describe('getCelebration', () => {
  it('traz o roteiro na ordem do rito com as músicas', async () => {
    const celebration = await createCelebration(missa, coordenador);
    const entrada = await createSong(
      { title: 'Eis-me aqui', chordPro: '[G]Eis-me aqui, Senhor', originalKey: 'G' },
      coordenador,
    );
    const final = await createSong(
      { title: 'Ide em paz', chordPro: '[D]Ide em paz', originalKey: 'D' },
      coordenador,
    );
    await setRepertoire(
      celebration.id,
      [
        { songId: final.id, moment: 'FINAL' },
        { songId: entrada.id, moment: 'ENTRADA' },
      ],
      coordenador,
    );

    const found = await getCelebration(celebration.id, musico);
    expect(found.repertoire.map((item) => item.moment)).toEqual(['ENTRADA', 'FINAL']);
    expect(found.repertoire[0].song.title).toBe('Eis-me aqui');
    expect(found.missingMoments).toContain('SALMO');
  });

  it('avisa quando não existe', async () => {
    await expect(getCelebration('inexistente', musico)).rejects.toMatchObject({ status: 404 });
  });
});

describe('nextCelebrations', () => {
  it('traz apenas as celebrações a partir da data de referência', async () => {
    await createCelebration({ ...missa, title: 'Passada', date: '2026-01-01T10:00:00.000Z' }, coordenador);
    await createCelebration({ ...missa, title: 'Futura', date: '2026-06-01T10:00:00.000Z' }, coordenador);

    const list = await nextCelebrations({ from: '2026-03-01T00:00:00.000Z', limit: 5 }, musico);
    expect(list.map((c) => c.title)).toEqual(['Futura']);
  });
});

describe('listCelebrationCapelas', () => {
  it('lista só as capelas que têm alguma celebração, sem repetir', async () => {
    await createCelebration({ ...missa, title: 'Primeira' }, coordenador);
    await createCelebration({ ...missa, title: 'Segunda' }, coordenador);
    // Capela fundada pelo coordenador (logo visível) mas sem nenhuma
    // celebração — não deve aparecer no filtro.
    await makeCapela({ name: 'Sem eventos', createdById: coordenador.id });

    const capelas = await listCelebrationCapelas(coordenador);
    expect(capelas).toEqual([{ id: capela.id, name: capela.name }]);
  });
});

describe('deleteCelebration', () => {
  it('remove a evento junto com o roteiro', async () => {
    const celebration = await createCelebration(missa, coordenador);
    const song = await createSong({ title: 'X', chordPro: '[C]X', originalKey: 'C' }, coordenador);
    await setRepertoire(celebration.id, [{ songId: song.id, moment: 'ENTRADA' }], coordenador);

    await deleteCelebration(celebration.id, coordenador);
    expect(await prisma.celebration.count()).toBe(0);
    expect(await prisma.repertoireItem.count()).toBe(0);
    expect(await prisma.song.count()).toBe(1);
  });

  it('só o coordenador remove celebrações', async () => {
    const celebration = await createCelebration(missa, coordenador);
    await expect(deleteCelebration(celebration.id, musico)).rejects.toMatchObject({ status: 403 });
  });
});

describe('isolamento entre capelas', () => {
  it('músico de outra capela não vê a evento, a não ser que participe dela', async () => {
    const celebration = await createCelebration(missa, coordenador);
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const musicoDeFora = await makeMusician({ capelaId: outraCapela.id });

    expect(await listCelebrations({}, musicoDeFora)).toEqual([]);
    await expect(getCelebration(celebration.id, musicoDeFora)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('músico vê (mas não gerencia) evento de outra capela quando é participante', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const visitante = await makeMusician({ name: 'Visitante', capelaId: outraCapela.id });
    const celebration = await createCelebration(
      { ...missa, participantIds: [visitante.id] },
      coordenador,
    );

    const lista = await listCelebrations({}, visitante);
    expect(lista.map((c) => c.id)).toContain(celebration.id);
    await expect(getCelebration(celebration.id, visitante)).resolves.toMatchObject({
      id: celebration.id,
    });
  });

  it('coordenador de outra capela não edita nem remove a evento', async () => {
    const celebration = await createCelebration(missa, coordenador);
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const coordenadorDeFora = await makeCoordinator({ capelaId: outraCapela.id });

    await expect(
      updateCelebration(celebration.id, { ...missa, title: 'Invadida' }, coordenadorDeFora),
    ).rejects.toMatchObject({ status: 403 });
    await expect(deleteCelebration(celebration.id, coordenadorDeFora)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('coordenador vê (mas não gerencia) evento de qualquer capela', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const coordenadorDeLa = await makeCoordinator({ capelaId: outraCapela.id });
    const celebration = await createCelebration({ ...missa, title: 'Missa de lá' }, coordenadorDeLa);

    const lista = await listCelebrations({}, coordenador);
    expect(lista.map((c) => c.title)).toContain('Missa de lá');
    await expect(getCelebration(celebration.id, coordenador)).resolves.toMatchObject({
      title: 'Missa de lá',
    });

    await expect(
      updateCelebration(celebration.id, { ...missa, title: 'Invadida' }, coordenador),
    ).rejects.toMatchObject({ status: 403 });
    await expect(deleteCelebration(celebration.id, coordenador)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('só administrador funda capela — coordenador nunca ganha gestão de outra capela', async () => {
    const outraCapela = await makeCapela({ name: 'Capela alheia' });

    await expect(
      createCelebration({ ...missa, title: 'Missa alheia', capelaId: outraCapela.id }, coordenador),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('coordenador escalado como participante edita as informações do evento de outra capela', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const coordenadorVisitante = await makeCoordinator({ capelaId: outraCapela.id });
    const celebration = await createCelebration(
      { ...missa, participantIds: [coordenadorVisitante.id] },
      coordenador,
    );

    const updated = await updateCelebration(
      celebration.id,
      { ...missa, title: 'Editado pelo visitante' },
      coordenadorVisitante,
    );
    expect(updated.title).toBe('Editado pelo visitante');

    // Mas isso não estende pro roteiro nem pra exclusão — essas continuam
    // exclusivas de quem administra a capela dona.
    await expect(deleteCelebration(celebration.id, coordenadorVisitante)).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe('participantes', () => {
  it('escala participantes na criação, inclusive de outra capela', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const visitante = await makeMusician({ name: 'Visitante', capelaId: outraCapela.id });

    const celebration = await createCelebration(
      { ...missa, participantIds: [musico.id, visitante.id] },
      coordenador,
    );
    const found = await getCelebration(celebration.id, coordenador);
    expect(found.participants.map((p) => p.id).sort()).toEqual([musico.id, visitante.id].sort());
  });

  it('lista a própria capela do observador primeiro, depois as outras, por nome', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const zeta = await makeMusician({ name: 'Zeta', capelaId: capela.id });
    const alfa = await makeMusician({ name: 'Alfa Visitante', capelaId: outraCapela.id });

    const celebration = await createCelebration(
      { ...missa, participantIds: [alfa.id, zeta.id, musico.id] },
      coordenador,
    );
    const found = await getCelebration(celebration.id, coordenador);
    // Própria capela (musico, Zeta) em ordem alfabética, depois a visitante.
    expect(found.participants.map((p) => p.name)).toEqual(['João Músico', 'Zeta', 'Alfa Visitante']);
  });

  it('recusa participante inexistente', async () => {
    await expect(
      createCelebration({ ...missa, participantIds: ['inexistente'] }, coordenador),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('updateCelebration substitui a lista de participantes', async () => {
    const outro = await makeMusician({ capelaId: capela.id });
    const celebration = await createCelebration({ ...missa, participantIds: [musico.id] }, coordenador);

    const updated = await updateCelebration(
      celebration.id,
      { ...missa, participantIds: [outro.id] },
      coordenador,
    );
    const found = await getCelebration(updated.id, coordenador);
    expect(found.participants.map((p) => p.id)).toEqual([outro.id]);
  });
});
