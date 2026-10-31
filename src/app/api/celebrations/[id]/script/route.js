import { handle, json } from '@/lib/api.js';
import { currentUser } from '@/lib/session.js';
import { buildScript } from '@/services/repertoire.js';

/** Roteiro pronto para cantar: cada cifra já no tom da evento. */
export async function GET(request, { params }) {
  return handle(async () => {
    const actor = await currentUser();
    const { id } = await params;
    return json({ script: await buildScript(id, actor) });
  });
}
