import { handle, json, readJson } from '@/lib/api.js';
import { currentUser } from '@/lib/session.js';
import { createCapela, listManagedCapelas } from '@/services/capelas.js';

/** Capelas que o ator administra: todas para o dono, as que coordena para os demais. */
export async function GET() {
  return handle(async () => {
    const actor = await currentUser();
    return json({ capelas: await listManagedCapelas(actor) });
  });
}

/** Só o dono cria capelas. */
export async function POST(request) {
  return handle(async () => {
    const actor = await currentUser();
    const capela = await createCapela(await readJson(request), actor);
    return json({ capela }, 201);
  });
}
