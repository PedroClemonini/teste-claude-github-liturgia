import { handle, json, readJson } from '@/lib/api.js';
import { currentUser } from '@/lib/session.js';
import { createSong, searchSongs } from '@/services/songs.js';
import { ACTIONS, assertCan } from '@/domain/auth/roles.js';

/** Catálogo central: ?q= título, letra ou tag, ?moment=, ?season=, ?tag= */
export async function GET(request) {
  return handle(async () => {
    const actor = await currentUser();
    assertCan(actor, ACTIONS.VIEW_SONG);

    const url = new URL(request.url);
    const songs = await searchSongs({
      query: url.searchParams.get('q') ?? undefined,
      moment: url.searchParams.get('moment') ?? undefined,
      season: url.searchParams.get('season') ?? undefined,
      tag: url.searchParams.get('tag') ?? undefined,
      limit: Number(url.searchParams.get('limit')) || undefined,
    });
    return json({ songs });
  });
}

export async function POST(request) {
  return handle(async () => {
    const actor = await currentUser();
    const song = await createSong(await readJson(request), actor);
    return json({ song }, 201);
  });
}
