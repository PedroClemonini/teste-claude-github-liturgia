import { handle, json, readJson } from '@/lib/api.js';
import { currentUser } from '@/lib/session.js';
import { removeMember, updateMember } from '@/services/users.js';

/** Edição completa do integrante — exclusiva do dono. */
export async function PATCH(request, { params }) {
  return handle(async () => {
    const actor = await currentUser();
    const { id } = await params;
    const user = await updateMember(id, await readJson(request), actor);
    return json({ user });
  });
}

/** Apaga a conta inteira — exclusivo do dono. */
export async function DELETE(request, { params }) {
  return handle(async () => {
    const actor = await currentUser();
    const { id } = await params;
    return json(await removeMember(id, actor));
  });
}
