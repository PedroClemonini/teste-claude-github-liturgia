import { handle, json, readJson } from '@/lib/api.js';
import { currentUser } from '@/lib/session.js';
import { listRepertoire, setRepertoire } from '@/services/repertoire.js';
import { getCelebration } from '@/services/celebrations.js';

export async function GET(request, { params }) {
  return handle(async () => {
    const actor = await currentUser();
    const { id } = await params;
    // Passa pelo serviço de celebrações para validar acesso e existência.
    await getCelebration(id, actor);
    return json({ repertoire: await listRepertoire(id) });
  });
}

/** Salva o roteiro musical inteiro da evento. */
export async function PUT(request, { params }) {
  return handle(async () => {
    const actor = await currentUser();
    const { id } = await params;
    const body = await readJson(request);
    const repertoire = await setRepertoire(id, body.items ?? [], actor);
    return json({ repertoire });
  });
}
