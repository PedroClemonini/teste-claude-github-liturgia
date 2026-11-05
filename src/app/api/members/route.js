import { handle, json, readJson } from '@/lib/api.js';
import { currentUser } from '@/lib/session.js';
import { createMember, listMembers } from '@/services/users.js';

export async function GET() {
  return handle(async () => {
    const actor = await currentUser();
    return json({ members: await listMembers(actor) });
  });
}

/** Cria uma pessoa direto numa capela — exclusivo do dono. */
export async function POST(request) {
  return handle(async () => {
    const actor = await currentUser();
    return json({ user: await createMember(await readJson(request), actor) }, 201);
  });
}
