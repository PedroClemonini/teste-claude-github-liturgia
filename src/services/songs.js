/**
 * Acervo de músicas e cifras.
 *
 * A cifra é guardada em ChordPro (fonte única da verdade) e, junto dela, uma
 * cópia da letra sem acordes: é essa cópia que permite buscar a música por um
 * trecho cantado, sem que os colchetes atrapalhem o casamento do texto.
 */
import { prisma } from '@/lib/prisma.js';
import { songSchema } from '@/domain/validation/schemas.js';
import { ACTIONS, assertCan } from '@/domain/auth/roles.js';
import { extractPlainLyrics } from '@/domain/chordpro/parse.js';
import { matchingTags, normalizeTag } from '@/domain/songs/tags.js';
import { ConflictError, NotFoundError, unwrap } from '@/domain/errors.js';

const MAX_RESULTS = 200;

function toRow(data) {
  return {
    title: data.title,
    composer: data.composer ?? null,
    chordPro: data.chordPro,
    originalKey: data.originalKey,
    audioUrl: data.audioUrl ?? null,
    moments: data.moments,
    seasons: data.seasons,
    tags: data.tags,
    plainLyrics: extractPlainLyrics(data.chordPro),
  };
}

/** @param {object} input @param {{id: string, role: string}} actor */
export async function createSong(input, actor) {
  assertCan(actor, ACTIONS.MANAGE_SONG);
  const data = unwrap(songSchema.safeParse(input));
  return prisma.song.create({ data: { ...toRow(data), createdById: actor.id } });
}

export async function updateSong(id, input, actor) {
  assertCan(actor, ACTIONS.MANAGE_SONG);
  const data = unwrap(songSchema.safeParse(input));

  const existing = await prisma.song.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Música não encontrada.');

  return prisma.song.update({ where: { id }, data: toRow(data) });
}

export async function getSong(id) {
  const song = await prisma.song.findUnique({ where: { id } });
  if (!song) throw new NotFoundError('Música não encontrada.');
  return song;
}

/**
 * Catálogo central: busca por título, trecho da letra, momento do rito e
 * tempo litúrgico. O filtro por tempo é estrito: só traz as músicas marcadas
 * com aquele tempo, deixando de fora as que não têm tempo definido. O texto
 * também acha tags pelo pedaço do nome; começando com #, procura só nas tags.
 *
 * @param {{query?: string, moment?: string, season?: string, tag?: string, limit?: number}} filters
 */
export async function searchSongs(filters = {}) {
  const { query, moment, season, tag, limit } = filters;
  const where = { AND: [] };

  if (query?.trim()) {
    const term = query.trim();
    const tags = matchingTags(await listSongTags(), term);
    const byTag = { tags: { hasSome: tags } };
    where.AND.push(
      term.startsWith('#')
        ? byTag
        : {
            OR: [
              { title: { contains: term, mode: 'insensitive' } },
              { plainLyrics: { contains: term, mode: 'insensitive' } },
              { composer: { contains: term, mode: 'insensitive' } },
              byTag,
            ],
          },
    );
  }
  if (tag) where.AND.push({ tags: { has: normalizeTag(tag) } });
  if (moment) where.AND.push({ moments: { has: moment } });
  if (season) where.AND.push({ seasons: { has: season } });
  if (where.AND.length === 0) delete where.AND;

  return prisma.song.findMany({
    where,
    orderBy: { title: 'asc' },
    take: Math.min(limit ?? 50, MAX_RESULTS),
  });
}

/** Todas as tags em uso, em ordem alfabética. */
export async function listSongTags() {
  const rows = await prisma.$queryRaw`SELECT DISTINCT unnest(tags) AS tag FROM "Song" ORDER BY tag`;
  return rows.map((row) => row.tag);
}

export async function deleteSong(id, actor) {
  assertCan(actor, ACTIONS.MANAGE_SONG);

  const song = await prisma.song.findUnique({
    where: { id },
    include: { _count: { select: { repertoire: true } } },
  });
  if (!song) throw new NotFoundError('Música não encontrada.');
  if (song._count.repertoire > 0) {
    throw new ConflictError(
      'Esta música está no roteiro de um evento. Retire-a do roteiro antes de removê-la do acervo.',
    );
  }

  await prisma.song.delete({ where: { id } });
  return { id };
}
