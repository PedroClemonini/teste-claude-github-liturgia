import { handle, json, readJson } from '@/lib/api.js';
import { currentUser } from '@/lib/session.js';
import { reassignCapela } from '@/services/users.js';

/** Move um integrante para outra capela — exclusivo do administrador. */
export async function PATCH(request, { params }) {
  return handle(async () => {
    const actor = await currentUser();
    const { id } = await params;
    const { capelaId } = await readJson(request);
    return json({ user: await reassignCapela(id, capelaId, actor) });
  });
}
