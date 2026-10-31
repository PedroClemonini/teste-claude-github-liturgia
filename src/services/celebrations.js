/**
 * Calendário litúrgico: missas comuns, missas solenes e ensaios.
 */
import { prisma } from '@/lib/prisma.js';
import { celebrationSchema } from '@/domain/validation/schemas.js';
import { ACTIONS, assertCan, assertManagesCapela, isCoordinator } from '@/domain/auth/roles.js';
import { missingMoments, sortRepertoire } from '@/domain/liturgy/moments.js';
import { NotFoundError, unwrap } from '@/domain/errors.js';

/**
 * Filtro de visibilidade das celebrações: o coordenador vê de qualquer
 * capela (pode restringir a uma só via `capelaId`); o músico só vê a
 * própria capela, mais qualquer celebração — de qualquer capela — em que
 * tenha sido escalado como participante.
 */
function visibilityWhere(actor, capelaId) {
  if (isCoordinator(actor)) {
    return capelaId ? { capelaId } : {};
  }
  return {
    OR: [{ capelaId: actor?.capelaId ?? '__none__' }, { participants: { some: { id: actor.id } } }],
  };
}

/**
 * Ver o detalhe de uma celebração segue a mesma regra de `visibilityWhere`:
 * coordenador vê qualquer uma; músico só a própria ou onde participa. Isso
 * não dá direito de geri-la — isso é checado à parte por `assertManagesCapela`.
 */
export function canViewCelebration(actor, celebration) {
  if (isCoordinator(actor)) return true;
  if (celebration.capelaId === actor.capelaId) return true;
  return celebration.participants?.some((participant) => participant.id === actor.id) ?? false;
}

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

/** Confere que os participantes escolhidos existem (de qualquer capela). */
async function requireParticipants(userIds) {
  if (userIds.length === 0) return;
  const found = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true } });
  if (found.length !== new Set(userIds).size) {
    throw new NotFoundError('Um dos participantes escolhidos não existe.');
  }
}

export async function createCelebration(input, actor) {
  assertCan(actor, ACTIONS.MANAGE_CELEBRATION);
  const data = unwrap(celebrationSchema.safeParse(input));

  const capelaId = data.capelaId ?? actor.capelaId;
  const capela = capelaId ? await prisma.capela.findUnique({ where: { id: capelaId } }) : null;
  assertManagesCapela(actor, capela);
  await requireParticipants(data.participantIds);

  return prisma.celebration.create({
    data: {
      ...toRow(data),
      capelaId: capela.id,
      createdById: actor.id,
      participants: { connect: data.participantIds.map((id) => ({ id })) },
    },
  });
}

/**
 * Um coordenador escalado como participante de uma celebração de outra
 * capela ganha o direito de editar as informações dela (não o roteiro nem
 * excluí-la — isso continua exclusivo de quem administra a capela dona).
 */
export function isParticipantCoordinator(actor, celebration) {
  return isCoordinator(actor) && (celebration.participants ?? []).some((p) => p.id === actor.id);
}

export async function updateCelebration(id, input, actor) {
  assertCan(actor, ACTIONS.MANAGE_CELEBRATION);
  const data = unwrap(celebrationSchema.safeParse(input));

  const existing = await prisma.celebration.findUnique({
    where: { id },
    include: { participants: { select: { id: true } } },
  });
  if (!existing) throw new NotFoundError('evento não encontrada.');

  if (!isParticipantCoordinator(actor, existing)) {
    const capela = await prisma.capela.findUnique({ where: { id: existing.capelaId } });
    assertManagesCapela(actor, capela);
  }
  await requireParticipants(data.participantIds);

  // A capela de uma evento não muda por aqui; ignoramos o campo.
  return prisma.celebration.update({
    where: { id },
    data: { ...toRow(data), participants: { set: data.participantIds.map((id) => ({ id })) } },
  });
}

export async function deleteCelebration(id, actor) {
  assertCan(actor, ACTIONS.MANAGE_CELEBRATION);
  const existing = await prisma.celebration.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('evento não encontrada.');

  const capela = await prisma.capela.findUnique({ where: { id: existing.capelaId } });
  assertManagesCapela(actor, capela);

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
 * @param {{from?: string|Date, to?: string|Date, type?: string, season?: string, capelaId?: string}} filters
 */
export async function listCelebrations(filters = {}, actor) {
  assertCan(actor, ACTIONS.VIEW_CALENDAR);
  const rows = await prisma.celebration.findMany({
    where: { ...celebrationWhere(filters), ...visibilityWhere(actor, filters.capelaId) },
    orderBy: { date: 'asc' },
    include: { _count: { select: { repertoire: true } } },
  });
  return rows.map(({ _count, ...celebration }) => ({
    ...celebration,
    songCount: _count.repertoire,
  }));
}

/** Próximas celebrações a partir de uma data de referência (padrão: agora). */
export async function nextCelebrations({ from = new Date(), limit = 5, capelaId } = {}, actor) {
  assertCan(actor, ACTIONS.VIEW_CALENDAR);
  const rows = await prisma.celebration.findMany({
    where: { date: { gte: new Date(from) }, ...visibilityWhere(actor, capelaId) },
    orderBy: { date: 'asc' },
    take: limit,
    include: { _count: { select: { repertoire: true } } },
  });
  return rows.map(({ _count, ...celebration }) => ({
    ...celebration,
    songCount: _count.repertoire,
  }));
}

/**
 * Capelas com ao menos uma celebração, para o filtro da agenda — só o
 * coordenador tem esse filtro (vê de todas as capelas); o músico não.
 */
export async function listCelebrationCapelas(actor) {
  assertCan(actor, ACTIONS.VIEW_CALENDAR);
  if (!isCoordinator(actor)) return [];

  const rows = await prisma.celebration.findMany({
    select: { capela: { select: { id: true, name: true } } },
    distinct: ['capelaId'],
  });
  return rows.map((row) => row.capela).sort((a, b) => a.name.localeCompare(b.name));
}

/** Participantes com a própria capela do observador primeiro, depois as demais, por nome. */
export function sortByOwnCapelaFirst(participants, viewerCapelaId) {
  return [...participants].sort((a, b) => {
    const aOwn = a.capelaId === viewerCapelaId ? 0 : 1;
    const bOwn = b.capelaId === viewerCapelaId ? 0 : 1;
    if (aOwn !== bOwn) return aOwn - bOwn;
    return a.name.localeCompare(b.name);
  });
}

/** Detalhes da evento com o roteiro na ordem do rito. */
export async function getCelebration(id, actor) {
  assertCan(actor, ACTIONS.VIEW_CALENDAR);
  const celebration = await prisma.celebration.findUnique({
    where: { id },
    include: {
      capela: true,
      repertoire: { include: { song: true } },
      createdBy: { select: { id: true, name: true } },
      participants: {
        select: { id: true, name: true, voiceOrInstrument: true, capelaId: true, capela: { select: { name: true } } },
      },
    },
  });
  // evento de outra capela responde igual a "não existe" — não vaza
  // que ela existe em outro lugar.
  if (!celebration || !canViewCelebration(actor, celebration)) {
    throw new NotFoundError('evento não encontrada.');
  }

  const repertoire = sortRepertoire(celebration.repertoire);
  const participants = sortByOwnCapelaFirst(celebration.participants, actor.capelaId);
  return { ...celebration, repertoire, participants, missingMoments: missingMoments(repertoire) };
}
