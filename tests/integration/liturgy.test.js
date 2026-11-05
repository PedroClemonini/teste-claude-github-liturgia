import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { prisma, resetDatabase, makeCapela, makeMusician } from '../helpers/db.js';
import { fillUpcomingLiturgy, getLiturgy, getLiturgyColors } from '@/services/liturgy.js';

const resposta = (data) => ({
  data,
  celebracoes: [{ id: 'dia', liturgia: `Liturgia ${data}`, cor: 'Verde', principal: true }],
});
const ok = (data) => ({ ok: true, status: 200, json: async () => resposta(data) });
const naoExiste = { ok: false, status: 404, json: async () => ({ erro: 'x' }) };
const foraDoAr = { ok: false, status: 503, json: async () => ({}) };

const pedidas = () => global.fetch.mock.calls.map(([url]) => new URL(url).searchParams.get('dia'));
const data = (iso) => new Date(`${iso}T00:00:00.000Z`);

let actor;

beforeEach(async () => {
  await resetDatabase();
  const capela = await makeCapela();
  actor = await makeMusician({ capelaId: capela.id });
  global.fetch = vi.fn(async (url) => ok(new URL(url).searchParams.get('dia')));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => prisma.$disconnect());

describe('getLiturgy', () => {
  it('busca na API, guarda e da segunda vez lê do banco', async () => {
    const primeira = await getLiturgy('2026-11-08', actor);
    const segunda = await getLiturgy('2026-11-08', actor);

    expect(primeira.celebracoes[0].liturgia).toBe('Liturgia 08');
    expect(segunda).toEqual(primeira);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('com a API fora do ar devolve null e não grava nada', async () => {
    global.fetch = vi.fn(async () => foraDoAr);
    expect(await getLiturgy('2026-11-08', actor)).toBeNull();
    expect(await prisma.liturgyDay.count()).toBe(0);

    global.fetch = vi.fn(async () => {
      throw new Error('timeout');
    });
    expect(await getLiturgy('2026-11-08', actor)).toBeNull();
    expect(await prisma.liturgyDay.count()).toBe(0);
  });

  it('o que já foi guardado continua valendo com a API fora do ar', async () => {
    await getLiturgy('2026-11-08', actor);
    global.fetch = vi.fn(async () => foraDoAr);
    expect((await getLiturgy('2026-11-08', actor)).data).toBe('08');
  });

  it('dia que a API não tem não é consultado de novo na hora', async () => {
    global.fetch = vi.fn(async () => naoExiste);
    expect(await getLiturgy('2026-11-08', actor)).toBeNull();
    expect(await getLiturgy('2026-11-08', actor)).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('dia indisponível é reconsultado depois de 24 horas', async () => {
    global.fetch = vi.fn(async () => naoExiste);
    await getLiturgy('2026-11-08', actor);
    await prisma.liturgyDay.update({
      where: { date: data('2026-11-08') },
      data: { fetchedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    });

    global.fetch = vi.fn(async () => ok('08'));
    expect((await getLiturgy('2026-11-08', actor)).data).toBe('08');
  });

  it('resposta em formato inesperado conta como indisponível', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ novo: 'formato' }) }));
    expect(await getLiturgy('2026-11-08', actor)).toBeNull();
  });

  it('exige login', async () => {
    await expect(getLiturgy('2026-11-08', null)).rejects.toMatchObject({ status: 401 });
  });
});

describe('getLiturgyColors', () => {
  it('traz a cor da celebração principal, ignorando dias sem liturgia', async () => {
    global.fetch = vi.fn(async (url) => {
      const dia = new URL(url).searchParams.get('dia');
      if (dia === '09') return naoExiste;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: dia,
          celebracoes: [
            { id: 'opcao', liturgia: 'Memória', cor: 'Branco', principal: false },
            { id: 'dia', liturgia: 'Domingo', cor: 'Verde', principal: true },
          ],
        }),
      };
    });
    await getLiturgy('2026-11-08', actor);
    await getLiturgy('2026-11-09', actor);

    expect(await getLiturgyColors(['2026-11-08', '2026-11-09', '2026-11-10'])).toEqual({
      '2026-11-08': { cor: 'Verde', liturgia: 'Domingo' },
    });
  });
});

describe('fillUpcomingLiturgy', () => {
  it('completa primeiro os dias que a pessoa está vendo, mesmo fora do ano corrente', async () => {
    await fillUpcomingLiturgy('2026-12-20', {
      limit: 3,
      pauseMs: 0,
      priorityDays: ['2027-01-05', '2027-01-06'],
    });
    expect(pedidas()).toEqual(['05', '06', '21']);
  });

  it('preenche aos poucos, sem repetir o que já tem', async () => {
    expect(await fillUpcomingLiturgy('2026-12-20', { limit: 3, pauseMs: 0 })).toBe(3);
    expect(pedidas()).toEqual(['21', '22', '23']);

    global.fetch.mockClear();
    expect(await fillUpcomingLiturgy('2026-12-20', { limit: 3, pauseMs: 0 })).toBe(3);
    expect(pedidas()).toEqual(['24', '25', '26']);
  });

  it('para em 31 de dezembro e depois não consulta mais', async () => {
    expect(await fillUpcomingLiturgy('2026-12-29', { limit: 5, pauseMs: 0 })).toBe(2);
    expect(await prisma.liturgyDay.count()).toBe(2);

    global.fetch.mockClear();
    expect(await fillUpcomingLiturgy('2026-12-29', { limit: 5, pauseMs: 0 })).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('dia sem liturgia não trava o resto', async () => {
    global.fetch = vi.fn(async (url) => {
      const dia = new URL(url).searchParams.get('dia');
      return dia === '22' ? naoExiste : ok(dia);
    });
    expect(await fillUpcomingLiturgy('2026-12-20', { limit: 3, pauseMs: 0 })).toBe(3);

    const linhas = await prisma.liturgyDay.findMany({ orderBy: { date: 'asc' } });
    expect(linhas.map((linha) => linha.payload !== null)).toEqual([true, false, true]);
  });

  it('para no primeiro erro de rede, sem gravar esse dia', async () => {
    global.fetch = vi.fn(async (url) => {
      const dia = new URL(url).searchParams.get('dia');
      return dia === '22' ? foraDoAr : ok(dia);
    });
    expect(await fillUpcomingLiturgy('2026-12-20', { limit: 5, pauseMs: 0 })).toBe(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(await prisma.liturgyDay.count()).toBe(1);
  });

  it('duas visitas ao mesmo tempo não consultam em dobro', async () => {
    const [a, b] = await Promise.all([
      fillUpcomingLiturgy('2026-12-20', { limit: 2, pauseMs: 0 }),
      fillUpcomingLiturgy('2026-12-20', { limit: 2, pauseMs: 0 }),
    ]);
    expect([a, b].sort()).toEqual([0, 2]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
