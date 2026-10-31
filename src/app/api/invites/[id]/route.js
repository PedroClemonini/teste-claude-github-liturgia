import { handle, json } from '@/lib/api.js';
import { currentUser } from '@/lib/session.js';
import { revokeInvite } from '@/services/invites.js';

/** Revoga um convite ainda não usado. */
export async function DELETE(request, { params }) {
  return handle(async () => {
    const actor = await currentUser();
    const { id } = await params;
    return json(await revokeInvite(id, actor));
  });
}
