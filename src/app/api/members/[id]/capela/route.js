import { handle, json, readJson } from '@/lib/api.js';
import { currentUser } from '@/lib/session.js';
import { addToCapela, removeFromCapela } from '@/services/users.js';

/** Coloca a pessoa numa capela: { capelaId, role } */
export async function POST(request, { params }) {
  return handle(async () => {
    const actor = await currentUser();
    const { id } = await params;
    const { capelaId, role = 'MUSICO' } = await readJson(request);
    return json({ user: await addToCapela(id, capelaId, role, actor) }, 201);
  });
}

/** Tira a pessoa de uma capela: ?capelaId= */
export async function DELETE(request, { params }) {
  return handle(async () => {
    const actor = await currentUser();
    const { id } = await params;
    const capelaId = new URL(request.url).searchParams.get('capelaId');
    return json(await removeFromCapela(id, capelaId, actor));
  });
}
