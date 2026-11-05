import { handle, json, readJson } from '@/lib/api.js';
import { currentUser } from '@/lib/session.js';
import { updateProfile } from '@/services/users.js';

/** A própria pessoa muda nome, e-mail, senha e instrumentos. */
export async function PATCH(request) {
  return handle(async () => {
    const actor = await currentUser();
    return json({ user: await updateProfile(await readJson(request), actor) });
  });
}
