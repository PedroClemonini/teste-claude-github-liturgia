/**
 * Liturgia do dia: datas e o formato esperado da API externa.
 *
 * A resposta vem de fora, então é validada antes de ir para o banco: se o
 * formato mudar, o dia conta como indisponível em vez de quebrar a tela.
 */
import { z } from 'zod';
import { seasonColor, seasonForDate } from './seasons.js';

const BRAZIL_TIME_ZONE = 'America/Sao_Paulo';

const optionalText = z.string().nullable().optional();

const celebrationSchema = z.object({
  id: z.string(),
  liturgia: z.string(),
  cor: z.string(),
  principal: z.boolean(),
  oracoes: z
    .object({
      coleta: optionalText,
      oferendas: optionalText,
      comunhao: optionalText,
      extras: z.array(z.object({ titulo: optionalText, texto: z.string() })).default([]),
    })
    .default({ extras: [] }),
  antifonas: z.object({ entrada: optionalText, comunhao: optionalText }).default({}),
  leituras: z
    .array(
      z.object({
        ordem: z.number(),
        tipo: z.string(),
        rotulo: z.string(),
        opcoes: z.array(
          z.object({
            referencia: optionalText,
            titulo: optionalText,
            refrao: optionalText,
            texto: z.string(),
          }),
        ),
      }),
    )
    .default([]),
});

export const liturgySchema = z.object({
  data: z.string(),
  celebracoes: z.array(celebrationSchema).min(1),
});

/** @param {unknown} value @returns {value is string} */
export function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** @param {string} iso AAAA-MM-DD */
export function isoToDate(iso) {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** @param {Date} date */
export function dateToIso(date) {
  return date.toISOString().slice(0, 10);
}

/** @param {string} iso @param {number} days */
export function addDaysIso(iso, days) {
  return dateToIso(new Date(isoToDate(iso).getTime() + days * 86_400_000));
}

/** Data de hoje no Brasil, em AAAA-MM-DD. */
export function todayInBrazil(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Dias depois de `fromIso` até 31 de dezembro do mesmo ano. */
export function daysUntilYearEnd(fromIso) {
  const last = `${fromIso.slice(0, 4)}-12-31`;
  const days = [];
  for (let day = addDaysIso(fromIso, 1); day <= last; day = addDaysIso(day, 1)) days.push(day);
  return days;
}

/** Cores que a API usa, na ordem da legenda. */
export const LITURGY_COLORS = ['Verde', 'Branco', 'Roxo', 'Rosa', 'Vermelho'];

/** Dia sem liturgia guardada: a cor própria do tempo litúrgico calculado. */
export function fallbackColor(season) {
  const color = seasonColor(season);
  return color.charAt(0).toUpperCase() + color.slice(1);
}

/** A partir desta hora, a missa de sábado já celebra o domingo. */
export const SUNDAY_VIGIL_HOUR = 17;

/** @param {string} iso AAAA-MM-DD */
export function isSaturday(iso) {
  return isoToDate(iso).getUTCDay() === 6;
}

/**
 * Missa no sábado: a data guardada é o horário digitado, por isso é lida em UTC.
 * @param {{date: Date|string, type: string}} celebration
 */
export function isSaturdayMass(celebration) {
  return celebration.type !== 'ENSAIO' && new Date(celebration.date).getUTCDay() === 6;
}

/** Sem escolha gravada, vale o horário: das 17h em diante, a liturgia de domingo. */
export function liturgyChoiceFor(celebration) {
  if (!isSaturdayMass(celebration)) return null;
  if (celebration.liturgyChoice) return celebration.liturgyChoice;
  return new Date(celebration.date).getUTCHours() >= SUNDAY_VIGIL_HOUR ? 'DOMINGO' : 'SABADO';
}

/** Dia cuja liturgia o evento segue, em AAAA-MM-DD. */
export function liturgyDateFor(celebration) {
  const iso = dateToIso(new Date(celebration.date));
  return liturgyChoiceFor(celebration) === 'DOMINGO' ? addDaysIso(iso, 1) : iso;
}

/**
 * Tempo litúrgico a mostrar: na vigília vale o do domingo, senão a missa de
 * 28/11 às 19h apareceria como Tempo Comum com a liturgia do Advento.
 */
export function displaySeason(celebration) {
  return liturgyChoiceFor(celebration) === 'DOMINGO'
    ? seasonForDate(liturgyDateFor(celebration))
    : celebration.season;
}

/** A celebração principal primeiro; as demais são opções do celebrante. */
export function sortCelebrations(celebrations) {
  return [...celebrations].sort((a, b) => Number(b.principal) - Number(a.principal));
}
