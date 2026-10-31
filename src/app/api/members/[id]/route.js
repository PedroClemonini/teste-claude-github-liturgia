import { handle, json, readJson } from '@/lib/api.js';
import { currentUser } from '@/lib/session.js';
import { removeMember, updateMember } from '@/services/users.js';

/** Edição completa do integrante — exclusiva do administrador. */
export async function PATCH(request, { params }) {
  return handle(async () => {
    const actor = await currentUser();
    const { id } = await params;
    const user = await updateMember(id, await readJson(request), actor);
    return json({ user });
  });
}

/** Remove um integrante: o coordenador só da própria capela, o administrador de qualquer uma. */
export async function DELETE(request, { params }) {
  return handle(async () => {
    const actor = await currentUser();
    const { id } = await params;
    return json(await removeMember(id, actor));
  });
}
