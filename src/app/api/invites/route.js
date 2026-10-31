import { handle, json, readJson } from '@/lib/api.js';
import { currentUser } from '@/lib/session.js';
import { createInvite, listInvites } from '@/services/invites.js';

/** Convites pendentes de uma capela: ?capelaId= */
export async function GET(request) {
  return handle(async () => {
    const actor = await currentUser();
    const url = new URL(request.url);
    const capelaId = url.searchParams.get('capelaId');
    return json({ invites: await listInvites(capelaId, actor) });
  });
}

/** Gera um novo link de convite para uma capela. */
export async function POST(request) {
  return handle(async () => {
    const actor = await currentUser();
    const { capelaId } = await readJson(request);
    const invite = await createInvite(capelaId, actor);
    return json({ invite }, 201);
  });
}
