import { handle, json, readJson } from '@/lib/api.js';
import { currentUser } from '@/lib/session.js';
import { deleteSong, getSong, updateSong } from '@/services/songs.js';
import { ACTIONS, assertCan } from '@/domain/auth/roles.js';

export async function GET(request, { params }) {
  return handle(async () => {
    const actor = await currentUser();
    assertCan(actor, ACTIONS.VIEW_SONG);
    const { id } = await params;
    return json({ song: await getSong(id) });
  });
}

export async function PUT(request, { params }) {
  return handle(async () => {
    const actor = await currentUser();
    const { id } = await params;
    return json({ song: await updateSong(id, await readJson(request), actor) });
  });
}

export async function DELETE(request, { params }) {
  return handle(async () => {
    const actor = await currentUser();
    const { id } = await params;
    return json(await deleteSong(id, actor));
  });
}
