/**
 * Calendário litúrgico: missas comuns, missas solenes e ensaios.
 */
import { prisma } from '@/lib/prisma.js';
import { celebrationSchema } from '@/domain/validation/schemas.js';
import { ACTIONS, assertCan } from '@/domain/auth/roles.js';
import { missingMoments, sortRepertoire } from '@/domain/liturgy/moments.js';
import { NotFoundError, unwrap } from '@/domain/errors.js';

function toRow(data) {
  return {
    title: data.title,
    date: data.date,
    type: data.type,
    season: data.season,
    location: data.location ?? null,
    notes: data.notes ?? null,
  };
}

export async function createCelebration(input, actor) {
  assertCan(actor, ACTIONS.MANAGE_CELEBRATION);
  const data = unwrap(celebrationSchema.safeParse(input));
  return prisma.celebration.create({ data: { ...toRow(data), createdById: actor.id } });
}

export async function updateCelebration(id, input, actor) {
  assertCan(actor, ACTIONS.MANAGE_CELEBRATION);
  const data = unwrap(celebrationSchema.safeParse(input));

  const existing = await prisma.celebration.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Celebração não encontrada.');

  return prisma.celebration.update({ where: { id }, data: toRow(data) });
}

export async function deleteCelebration(id, actor) {
  assertCan(actor, ACTIONS.MANAGE_CELEBRATION);
  const existing = await prisma.celebration.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Celebração não encontrada.');

  // O roteiro cai junto (onDelete: Cascade); o acervo permanece intacto.
  await prisma.celebration.delete({ where: { id } });
  return { id };
}

function celebrationWhere({ from, to, type, season }) {
  const where = {};
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }
  if (type) where.type = type;
  if (season) where.season = season;
  return where;
}

/**
 * Painel de agenda. `songCount` alimenta o indicador de roteiro pronto.
 * @param {{from?: string|Date, to?: string|Date, type?: string, season?: string}} filters
 */
export async function listCelebrations(filters = {}, actor) {
  assertCan(actor, ACTIONS.VIEW_CALENDAR);
  const rows = await prisma.celebration.findMany({
    where: celebrationWhere(filters),
    orderBy: { date: 'asc' },
    include: { _count: { select: { repertoire: true } } },
  });
  return rows.map(({ _count, ...celebration }) => ({
    ...celebration,
    songCount: _count.repertoire,
  }));
}

/** Próximas celebrações a partir de uma data de referência (padrão: agora). */
export async function nextCelebrations({ from = new Date(), limit = 5 } = {}, actor) {
  assertCan(actor, ACTIONS.VIEW_CALENDAR);
  const rows = await prisma.celebration.findMany({
    where: { date: { gte: new Date(from) } },
    orderBy: { date: 'asc' },
    take: limit,
    include: { _count: { select: { repertoire: true } } },
  });
  return rows.map(({ _count, ...celebration }) => ({
    ...celebration,
    songCount: _count.repertoire,
  }));
}

/** Detalhes da celebração com o roteiro na ordem do rito. */
export async function getCelebration(id, actor) {
  assertCan(actor, ACTIONS.VIEW_CALENDAR);
  const celebration = await prisma.celebration.findUnique({
    where: { id },
    include: {
      repertoire: { include: { song: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!celebration) throw new NotFoundError('Celebração não encontrada.');

  const repertoire = sortRepertoire(celebration.repertoire);
  return { ...celebration, repertoire, missingMoments: missingMoments(repertoire) };
}
