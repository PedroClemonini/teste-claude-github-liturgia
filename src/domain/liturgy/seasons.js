/**
 * Tempos litúrgicos do Rito Romano.
 *
 * Todo o cálculo é feito em UTC sobre datas sem hora, para que a resposta não
 * mude conforme o fuso do navegador de quem abre a agenda.
 */

/** @param {number} year @param {number} month 1-12 @param {number} day */
function utcDate(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 86_400_000);
}

/** Normaliza Date|string ISO em Date UTC truncada no dia. */
export function toUtcDay(value) {
  const date = value instanceof Date ? value : new Date(value);
  return utcDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/**
 * Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano).
 * @param {number} year
 * @returns {Date}
 */
export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utcDate(year, month, day);
}

/** Quarta-feira de Cinzas: 46 dias antes da Páscoa. */
export function ashWednesday(year) {
  return addDays(easterSunday(year), -46);
}

/** Quinta-feira Santa: início do Tríduo Pascal. */
export function holyThursday(year) {
  return addDays(easterSunday(year), -3);
}

/** Pentecostes: 49 dias após a Páscoa, encerrando o Tempo Pascal. */
export function pentecost(year) {
  return addDays(easterSunday(year), 49);
}

/** Natal. */
export function christmas(year) {
  return utcDate(year, 12, 25);
}

/**
 * Batismo do Senhor: primeiro domingo depois de 6 de janeiro (Epifania),
 * encerrando o Tempo do Natal.
 */
export function baptismOfTheLord(year) {
  const epiphany = utcDate(year, 1, 6);
  const daysToSunday = 7 - epiphany.getUTCDay() || 7;
  return addDays(epiphany, daysToSunday);
}

/** Primeiro Domingo do Advento: quatro domingos antes do Natal. */
export function firstSundayOfAdvent(year) {
  const natal = christmas(year);
  // Domingo imediatamente anterior (ou igual, se o Natal cair no domingo).
  const fourthSunday = addDays(natal, -(natal.getUTCDay() || 7));
  return addDays(fourthSunday, -21);
}

export const LITURGICAL_SEASONS = [
  { id: 'ADVENTO', label: 'Advento', color: 'roxo' },
  { id: 'NATAL', label: 'Natal', color: 'branco' },
  { id: 'QUARESMA', label: 'Quaresma', color: 'roxo' },
  { id: 'TRIDUO_PASCAL', label: 'Tríduo Pascal', color: 'vermelho' },
  { id: 'PASCOA', label: 'Tempo Pascal', color: 'branco' },
  { id: 'TEMPO_COMUM', label: 'Tempo Comum', color: 'verde' },
];

const SEASON_BY_ID = new Map(LITURGICAL_SEASONS.map((season) => [season.id, season]));

/** @param {string} id */
export function seasonLabel(id) {
  return SEASON_BY_ID.get(id)?.label ?? id;
}

/** @param {string} id */
export function seasonColor(id) {
  return SEASON_BY_ID.get(id)?.color ?? 'verde';
}

/** @param {string} id */
export function isValidSeason(id) {
  return SEASON_BY_ID.has(id);
}

/**
 * Tempo litúrgico vigente na data informada.
 * @param {Date|string} value
 * @returns {'ADVENTO'|'NATAL'|'QUARESMA'|'TRIDUO_PASCAL'|'PASCOA'|'TEMPO_COMUM'}
 */
export function seasonForDate(value) {
  const day = toUtcDay(value);
  const year = day.getUTCFullYear();

  // Tempo do Natal que começou em dezembro do ano anterior e se encerra no
  // Batismo do Senhor, ainda em janeiro.
  if (day <= baptismOfTheLord(year)) return 'NATAL';
  if (day >= firstSundayOfAdvent(year) && day < christmas(year)) return 'ADVENTO';
  if (day >= christmas(year)) return 'NATAL';

  const ashes = ashWednesday(year);
  const thursday = holyThursday(year);
  const easter = easterSunday(year);

  if (day >= ashes && day < thursday) return 'QUARESMA';
  if (day >= thursday && day < easter) return 'TRIDUO_PASCAL';
  if (day >= easter && day <= pentecost(year)) return 'PASCOA';

  return 'TEMPO_COMUM';
}
