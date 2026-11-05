/**
 * Liturgia do dia. O banco é a fonte da tela: a API externa só é chamada para
 * o que falta, e cada visita à Agenda completa mais alguns dias até o fim do ano.
 * Assim uma queda da API não afeta o que já foi guardado.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma.js';
import { ACTIONS, assertCan } from '@/domain/auth/roles.js';
import {
  daysUntilYearEnd,
  dateToIso,
  isoToDate,
  liturgySchema,
  sortCelebrations,
} from '@/domain/liturgy/daily.js';

const DEFAULT_API_URL = 'https://liturgia.up.railway.app/v3/';
const REQUEST_TIMEOUT_MS = 4000;
/** Quantos dias cada visita completa, para não sobrecarregar a API gratuita. */
const DAYS_PER_VISIT = 5;
const PAUSE_BETWEEN_REQUESTS_MS = 300;
/** Um dia que a API não tinha pode aparecer depois. */
const RETRY_UNAVAILABLE_MS = 24 * 60 * 60 * 1000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {string} iso AAAA-MM-DD
 * @returns {Promise<object|null>} a liturgia, ou null se a API não tem esse dia
 * @throws se a API não respondeu: nada deve ser gravado nesse caso
 */
async function fetchFromApi(iso) {
  const [year, month, day] = iso.split('-');
  const url = new URL(process.env.LITURGY_API_URL ?? DEFAULT_API_URL);
  url.search = new URLSearchParams({ dia: day, mes: month, ano: year }).toString();

  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`API de liturgia respondeu ${response.status}`);

  const parsed = liturgySchema.safeParse(await response.json());
  if (!parsed.success) {
    console.warn('[liturgia] formato inesperado em', iso);
    return null;
  }
  return parsed.data;
}

async function fetchAndStore(iso) {
  const payload = await fetchFromApi(iso);
  const date = isoToDate(iso);
  const values = { payload: payload ?? Prisma.DbNull, fetchedAt: new Date() };
  await prisma.liturgyDay.upsert({ where: { date }, create: { date, ...values }, update: values });
  return payload;
}

const shouldRetry = (row, now = Date.now()) =>
  row.payload === null && now - row.fetchedAt.getTime() >= RETRY_UNAVAILABLE_MS;

/** Liturgia de um dia: do banco ou, se faltar, da API. Sem ela, devolve null. */
export async function getLiturgy(iso, actor) {
  assertCan(actor, ACTIONS.VIEW_CALENDAR);

  const row = await prisma.liturgyDay.findUnique({ where: { date: isoToDate(iso) } });
  if (row && !shouldRetry(row)) return row.payload;

  try {
    return await fetchAndStore(iso);
  } catch (error) {
    console.warn('[liturgia] API indisponível:', error.message);
    return null;
  }
}

/**
 * Cor e nome da celebração principal dos dias já guardados.
 * @param {string[]} days
 * @returns {Promise<Record<string, {cor: string, liturgia: string}>>}
 */
export async function getLiturgyColors(days) {
  const rows = await prisma.liturgyDay.findMany({ where: { date: { in: days.map(isoToDate) } } });
  const colors = {};
  for (const row of rows) {
    const principal = row.payload && sortCelebrations(row.payload.celebracoes)[0];
    if (principal) colors[dateToIso(row.date)] = { cor: principal.cor, liturgia: principal.liturgia };
  }
  return colors;
}

let filling = false;

/**
 * Completa alguns dos dias que faltam até o fim do ano. Para no primeiro erro
 * de rede: se a API caiu, insistir só atrasa e a próxima visita tenta de novo.
 *
 * @param {string} fromIso hoje, em AAAA-MM-DD
 * @param {{limit?: number, pauseMs?: number, priorityDays?: string[]}} [options]
 *   `priorityDays` vem antes da fila: são os dias que a pessoa está vendo.
 * @returns {Promise<number>} quantos dias foram consultados
 */
export async function fillUpcomingLiturgy(fromIso, options = {}) {
  const { limit = DAYS_PER_VISIT, pauseMs = PAUSE_BETWEEN_REQUESTS_MS, priorityDays = [] } = options;
  if (filling) return 0;
  filling = true;

  try {
    const days = [...new Set([...priorityDays, ...daysUntilYearEnd(fromIso)])];
    if (days.length === 0) return 0;

    const rows = await prisma.liturgyDay.findMany({ where: { date: { in: days.map(isoToDate) } } });
    const known = new Map(rows.map((row) => [dateToIso(row.date), row]));
    const missing = days.filter((day) => !known.has(day) || shouldRetry(known.get(day))).slice(0, limit);

    let done = 0;
    for (const day of missing) {
      if (done > 0) await wait(pauseMs);
      try {
        await fetchAndStore(day);
      } catch (error) {
        console.warn('[liturgia] preenchimento interrompido:', error.message);
        break;
      }
      done += 1;
    }
    return done;
  } finally {
    filling = false;
  }
}
