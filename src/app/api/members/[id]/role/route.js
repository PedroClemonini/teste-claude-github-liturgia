import { handle, json, readJson } from '@/lib/api.js';
import { currentUser } from '@/lib/session.js';
import { changeRole } from '@/services/users.js';

export async function PATCH(request, { params }) {
  return handle(async () => {
    const actor = await currentUser();
    const { id } = await params;
    const body = await readJson(request);
    return json({ user: await changeRole(id, body.role, actor) });
  });
}
