import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma, resetDatabase, makeCapela, makeCoordinator, makeMusician } from '../helpers/db.js';
import { createSong, updateSong, getSong, searchSongs, deleteSong, listSongTags } from '@/services/songs.js';
import { createCelebration } from '@/services/celebrations.js';
import { setRepertoire } from '@/services/repertoire.js';

let coordenador;
let musico;

beforeEach(async () => {
  await resetDatabase();
  const capela = await makeCapela();
  coordenador = await makeCoordinator({ capelaId: capela.id });
  musico = await makeMusician({ capelaId: capela.id });
});
afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

const paiNosso = {
  title: 'Pai Nosso',
  composer: 'Tradicional',
  chordPro: '{title: Pai Nosso}\n[G]Pai Nosso que est[C]ais no c[G]éu',
  originalKey: 'G',
  moments: ['COMUNHAO'],
  seasons: [],
};

describe('createSong', () => {
  it('grava a música e extrai a letra sem cifras para a busca', async () => {
    const song = await createSong(paiNosso, coordenador);
    expect(song.title).toBe('Pai Nosso');
    expect(song.plainLyrics).toBe('Pai Nosso que estais no céu');
    expect(song.createdById).toBe(coordenador.id);
  });

  it('deduz o tom original a partir do primeiro acorde', async () => {
    const song = await createSong({ ...paiNosso, originalKey: undefined }, coordenador);
    expect(song.originalKey).toBe('G');
  });

  it('só o coordenador cadastra músicas', async () => {
    await expect(createSong(paiNosso, musico)).rejects.toMatchObject({ status: 403 });
    await expect(createSong(paiNosso, null)).rejects.toMatchObject({ status: 401 });
    expect(await prisma.song.count()).toBe(0);
  });

  it('recusa música sem cifra', async () => {
    await expect(createSong({ ...paiNosso, chordPro: '' }, coordenador)).rejects.toMatchObject({
      status: 422,
    });
  });
});

describe('updateSong', () => {
  it('recalcula a letra de busca quando a cifra muda', async () => {
    const song = await createSong(paiNosso, coordenador);
    const updated = await updateSong(
      song.id,
      { ...paiNosso, chordPro: '[D]Santificado seja o vosso [A]nome' },
      coordenador,
    );
    expect(updated.plainLyrics).toBe('Santificado seja o vosso nome');
    expect(updated.originalKey).toBe('G');
  });

  it('avisa quando a música não existe', async () => {
    await expect(updateSong('inexistente', paiNosso, coordenador)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('getSong', () => {
  it('devolve a música pelo id', async () => {
    const song = await createSong(paiNosso, coordenador);
    expect((await getSong(song.id)).title).toBe('Pai Nosso');
  });

  it('avisa quando não existe', async () => {
    await expect(getSong('inexistente')).rejects.toMatchObject({ status: 404 });
  });
});

describe('searchSongs', () => {
  beforeEach(async () => {
    await createSong(paiNosso, coordenador);
    await createSong(
      {
        title: 'Vem, Espírito Santo',
        chordPro: '[Am]Vem, Espírito Santo, [F]enche o meu ser',
        originalKey: 'Am',
        moments: ['ENTRADA'],
        seasons: ['PASCOA'],
      },
      coordenador,
    );
    await createSong(
      {
        title: 'Noite Feliz',
        chordPro: '[C]Noite feliz, noite de [G]paz',
        originalKey: 'C',
        moments: ['ENTRADA', 'COMUNHAO'],
        seasons: ['NATAL'],
      },
      coordenador,
    );
  });

  it('lista o acervo em ordem alfabética quando não há filtro', async () => {
    const songs = await searchSongs({});
    expect(songs.map((s) => s.title)).toEqual(['Noite Feliz', 'Pai Nosso', 'Vem, Espírito Santo']);
  });

  it('busca por título ignorando acentuação de caixa', async () => {
    const songs = await searchSongs({ query: 'espírito' });
    expect(songs.map((s) => s.title)).toEqual(['Vem, Espírito Santo']);
  });

  it('busca por trecho da letra', async () => {
    const songs = await searchSongs({ query: 'enche o meu ser' });
    expect(songs.map((s) => s.title)).toEqual(['Vem, Espírito Santo']);
  });

  it('filtra por momento do rito', async () => {
    const songs = await searchSongs({ moment: 'COMUNHAO' });
    expect(songs.map((s) => s.title)).toEqual(['Noite Feliz', 'Pai Nosso']);
  });

  it('filtra por tempo litúrgico, trazendo só as músicas marcadas com ele', async () => {
    const songs = await searchSongs({ season: 'NATAL' });
    // "Pai Nosso" não tem tempo definido, logo fica de fora do filtro.
    expect(songs.map((s) => s.title)).toEqual(['Noite Feliz']);
  });

  it('combina filtros', async () => {
    const songs = await searchSongs({ query: 'noite', moment: 'ENTRADA', season: 'NATAL' });
    expect(songs.map((s) => s.title)).toEqual(['Noite Feliz']);
  });

  it('guarda as tags num formato único, sem repetir', async () => {
    const song = await createSong(
      { ...paiNosso, title: 'Hino', tags: ['#Novena São Francisco', 'novenasaofrancisco', ' Bênção '] },
      coordenador,
    );
    expect(song.tags).toEqual(['novenasaofrancisco', 'bencao']);
  });

  it('acha por tag: pedaço do nome, com #, e pelo filtro exato', async () => {
    await createSong({ ...paiNosso, title: 'Hino', tags: ['novenasaofrancisco'] }, coordenador);
    await createSong({ ...paiNosso, title: 'Outro', tags: ['novenadenatal'] }, coordenador);

    const titulos = async (filtros) => (await searchSongs(filtros)).map((s) => s.title).sort();
    expect(await titulos({ query: '#novenasao' })).toEqual(['Hino']);
    expect(await titulos({ query: '#novena' })).toEqual(['Hino', 'Outro']);
    expect(await titulos({ query: 'São Francisco' })).toEqual(['Hino']);
    expect(await titulos({ tag: 'novenadenatal' })).toEqual(['Outro']);
    expect(await titulos({ tag: 'novena' })).toEqual([]);
  });

  it('com #, procura só nas tags, não no título', async () => {
    expect(await searchSongs({ query: '#noite' })).toEqual([]);
  });

  it('lista as tags em uso, sem repetir', async () => {
    await createSong({ ...paiNosso, title: 'A', tags: ['zeta', 'alfa'] }, coordenador);
    await createSong({ ...paiNosso, title: 'B', tags: ['alfa'] }, coordenador);
    expect(await listSongTags()).toEqual(['alfa', 'zeta']);
  });

  it('devolve lista vazia quando nada casa', async () => {
    expect(await searchSongs({ query: 'zabumba' })).toEqual([]);
  });

  it('respeita o limite de resultados', async () => {
    expect(await searchSongs({ limit: 2 })).toHaveLength(2);
  });
});

describe('deleteSong', () => {
  it('remove a música do acervo', async () => {
    const song = await createSong(paiNosso, coordenador);
    await deleteSong(song.id, coordenador);
    expect(await prisma.song.count()).toBe(0);
  });

  it('impede remover música que já está em um roteiro', async () => {
    const song = await createSong(paiNosso, coordenador);
    const celebration = await createCelebration(
      { title: 'Missa dominical', date: '2026-04-05T10:00:00.000Z', type: 'MISSA_COMUM' },
      coordenador,
    );
    await setRepertoire(
      celebration.id,
      [{ songId: song.id, moment: 'COMUNHAO' }],
      coordenador,
    );

    await expect(deleteSong(song.id, coordenador)).rejects.toMatchObject({ status: 409 });
    expect(await prisma.song.count()).toBe(1);
  });

  it('só o coordenador remove músicas', async () => {
    const song = await createSong(paiNosso, coordenador);
    await expect(deleteSong(song.id, musico)).rejects.toMatchObject({ status: 403 });
  });
});
