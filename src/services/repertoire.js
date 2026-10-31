/**
 * Roteiro musical: liga músicas do acervo aos momentos do rito.
 */
import { prisma } from '@/lib/prisma.js';
import { repertoireItemSchema } from '@/domain/validation/schemas.js';
import { ACTIONS, assertCan, assertManagesCapela } from '@/domain/auth/roles.js';
import { canViewCelebration } from '@/services/celebrations.js';
import { momentLabel, sortRepertoire } from '@/domain/liturgy/moments.js';
import { semitonesBetween, transposeChordPro } from '@/domain/chordpro/transpose.js';
import { ConflictError, NotFoundError, unwrap } from '@/domain/errors.js';

async function requireCelebration(celebrationId) {
  const celebration = await prisma.celebration.findUnique({
    where: { id: celebrationId },
    include: { capela: true, participants: { select: { id: true } } },
  });
  if (!celebration) throw new NotFoundError('evento não encontrada.');
  return celebration;
}

/** Leitura (roteiro/roteiro pronto): mesma regra 404 de `getCelebration`. */
function requireCanView(actor, celebration) {
  if (canViewCelebration(actor, celebration)) return;
  throw new NotFoundError('evento não encontrada.');
}

async function requireSongs(songIds) {
  const found = await prisma.song.findMany({
    where: { id: { in: songIds } },
    select: { id: true },
  });
  if (found.length !== new Set(songIds).size) {
    throw new NotFoundError('Uma das músicas escolhidas não está no acervo.');
  }
}

/**
 * Substitui o roteiro inteiro da evento, em uma única transação: ou o novo
 * roteiro entra completo, ou o anterior permanece como estava.
 *
 * @param {string} celebrationId
 * @param {Array<{songId: string, moment: string, position?: number, keyOverride?: string|null}>} items
 * @param {{id: string, role: string}} actor
 */
export async function setRepertoire(celebrationId, items, actor) {
  assertCan(actor, ACTIONS.MANAGE_REPERTOIRE);
  const celebration = await requireCelebration(celebrationId);
  assertManagesCapela(actor, celebration.capela);

  const parsed = items.map((item) => unwrap(repertoireItemSchema.safeParse(item)));

  const slots = new Set();
  for (const item of parsed) {
    const slot = `${item.moment}#${item.position}`;
    if (slots.has(slot)) {
      throw new ConflictError(
        `Há duas músicas na mesma posição do momento ${momentLabel(item.moment)}.`,
      );
    }
    slots.add(slot);
  }

  if (parsed.length > 0) await requireSongs(parsed.map((item) => item.songId));

  await prisma.$transaction([
    prisma.repertoireItem.deleteMany({ where: { celebrationId } }),
    prisma.repertoireItem.createMany({
      data: parsed.map((item) => ({ ...item, celebrationId })),
    }),
  ]);

  return listRepertoire(celebrationId);
}

/** Roteiro da evento, ordenado pelo rito. */
export async function listRepertoire(celebrationId) {
  const items = await prisma.repertoireItem.findMany({
    where: { celebrationId },
    include: { song: true },
  });
  return sortRepertoire(items);
}

/** Acrescenta uma música, empilhando na próxima posição livre do momento. */
export async function addRepertoireItem(celebrationId, input, actor) {
  assertCan(actor, ACTIONS.MANAGE_REPERTOIRE);
  const celebration = await requireCelebration(celebrationId);
  assertManagesCapela(actor, celebration.capela);
  const data = unwrap(repertoireItemSchema.safeParse(input));
  await requireSongs([data.songId]);

  const taken = await prisma.repertoireItem.findMany({
    where: { celebrationId, moment: data.moment },
    select: { position: true },
    orderBy: { position: 'asc' },
  });
  const positions = new Set(taken.map((item) => item.position));
  let position = data.position;
  while (positions.has(position)) position += 1;

  return prisma.repertoireItem.create({
    data: { ...data, position, celebrationId },
    include: { song: true },
  });
}

export async function removeRepertoireItem(itemId, actor) {
  assertCan(actor, ACTIONS.MANAGE_REPERTOIRE);
  const item = await prisma.repertoireItem.findUnique({
    where: { id: itemId },
    include: { celebration: { include: { capela: true } } },
  });
  if (!item) throw new NotFoundError('Item do roteiro não encontrado.');
  assertManagesCapela(actor, item.celebration.capela);

  await prisma.repertoireItem.delete({ where: { id: itemId } });
  return { id: itemId };
}

/**
 * Tom em que a música será executada nesta evento.
 * @param {{keyOverride?: string|null, song: {originalKey: string}}} item
 */
export function performanceKey(item) {
  return item.keyOverride ?? item.song.originalKey;
}

/**
 * Roteiro pronto para a tela do músico: cada canto já vem com a cifra no tom
 * definido para a evento, na ordem em que será cantado.
 */
export async function buildScript(celebrationId, actor) {
  assertCan(actor, ACTIONS.VIEW_SONG);
  const celebration = await requireCelebration(celebrationId);
  requireCanView(actor, celebration);

  const items = await listRepertoire(celebrationId);
  return items.map((item) => {
    const key = performanceKey(item);
    const semitones = semitonesBetween(item.song.originalKey, key);
    return {
      id: item.id,
      songId: item.songId,
      moment: item.moment,
      momentLabel: momentLabel(item.moment),
      position: item.position,
      title: item.song.title,
      composer: item.song.composer,
      originalKey: item.song.originalKey,
      key,
      // Pronto para imprimir ou consumir pela API, já no tom da evento.
      chordPro: transposeChordPro(item.song.chordPro, semitones, { targetKey: key }),
      // Texto como foi cadastrado: é dele que a tela do músico parte para
      // transpor ao vivo, sem correr o risco de transpor duas vezes.
      sourceChordPro: item.song.chordPro,
    };
  });
}
