import { handle, json, readJson } from '@/lib/api.js';
import { currentUser } from '@/lib/session.js';
import { setLiturgyChoice } from '@/services/celebrations.js';

/** Missa de sábado: { choice: 'SABADO' | 'DOMINGO' } */
export async function PATCH(request, { params }) {
  return handle(async () => {
    const actor = await currentUser();
    const { id } = await params;
    const { choice } = await readJson(request);
    return json({ celebration: await setLiturgyChoice(id, choice, actor) });
  });
}
