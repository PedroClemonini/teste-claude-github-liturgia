import { handle, json, readJson } from '@/lib/api.js';
import { currentUser } from '@/lib/session.js';
import { createCapela, listManagedCapelas } from '@/services/capelas.js';

/** Capelas que o coordenador administra: a de casa e as que fundou. */
export async function GET() {
  return handle(async () => {
    const actor = await currentUser();
    return json({ capelas: await listManagedCapelas(actor) });
  });
}

/** Qualquer coordenador pode fundar uma nova capela. */
export async function POST(request) {
  return handle(async () => {
    const actor = await currentUser();
    const capela = await createCapela(await readJson(request), actor);
    return json({ capela }, 201);
  });
}
