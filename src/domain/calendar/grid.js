/**
 * Montagem da grade do painel de agenda.
 *
 * Trabalha em UTC, como o resto do cálculo litúrgico: o mês exibido é o mesmo
 * para toda a equipe, independentemente do fuso do aparelho de quem consulta.
 */
import { seasonForDate } from '../liturgy/seasons.js';

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const CELEBRATION_TYPES = {
  MISSA_COMUM: 'Missa',
  MISSA_SOLENE: 'Missa solene',
  ENSAIO: 'Ensaio',
};

/** @param {string} type */
export function celebrationTypeLabel(type) {
  return CELEBRATION_TYPES[type] ?? type;
}

/** @param {number} year @param {number} month 1-12 */
export function monthLabel(year, month) {
  return `${MONTHS[month - 1]} de ${year}`;
}

/** Intervalo fechado que cobre o mês inteiro, para consultar o banco. */
export function monthRange(year, month) {
  return {
    from: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
    to: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  };
}

/** @param {number} year @param {number} month @param {number} delta */
export function shiftMonth(year, month, delta) {
  const base = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: base.getUTCFullYear(), month: base.getUTCMonth() + 1 };
}

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * @param {number} year
 * @param {number} month 1-12
 * @param {Array<{date: string|Date}>} celebrations
 * @returns {Array<Array<{date: Date, iso: string, day: number, inMonth: boolean, season: string, celebrations: object[]}>>}
 */
export function buildMonthGrid(year, month, celebrations = []) {
  const byDay = new Map();
  for (const celebration of celebrations) {
    const date = celebration.date instanceof Date ? celebration.date : new Date(celebration.date);
    const key = isoDay(date);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push({ ...celebration, date });
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.date - b.date);
  }

  const first = new Date(Date.UTC(year, month - 1, 1));
  const start = new Date(first.getTime() - first.getUTCDay() * 86_400_000);

  const last = new Date(Date.UTC(year, month, 0));
  const end = new Date(last.getTime() + (6 - last.getUTCDay()) * 86_400_000);

  const weeks = [];
  let week = [];
  for (let cursor = start; cursor <= end; cursor = new Date(cursor.getTime() + 86_400_000)) {
    const iso = isoDay(cursor);
    week.push({
      date: cursor,
      iso,
      day: cursor.getUTCDate(),
      inMonth: cursor.getUTCMonth() === month - 1,
      season: seasonForDate(cursor),
      celebrations: byDay.get(iso) ?? [],
    });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push(week);
  return weeks;
}
