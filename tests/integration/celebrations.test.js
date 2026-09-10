import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma, resetDatabase, makeCoordinator, makeMusician } from '../helpers/db.js';
import {
  createCelebration,
  updateCelebration,
  deleteCelebration,
  listCelebrations,
  getCelebration,
  nextCelebrations,
} from '@/services/celebrations.js';
import { createSong } from '@/services/songs.js';
import { setRepertoire } from '@/services/repertoire.js';

let coordenador;
let musico;

beforeEach(async () => {
  await resetDatabase();
  coordenador = await makeCoordinator();
  musico = await makeMusician();
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
  it('grava a celebração deduzindo o tempo litúrgico da data', async () => {
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

  it('avisa quando a celebração não existe', async () => {
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

  it('filtra por tipo de celebração', async () => {
    const list = await listCelebrations({ type: 'ENSAIO' }, musico);
    expect(list.map((c) => c.title)).toEqual(['Ensaio de março']);
  });

  it('conta o roteiro de cada celebração', async () => {
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

describe('deleteCelebration', () => {
  it('remove a celebração junto com o roteiro', async () => {
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
