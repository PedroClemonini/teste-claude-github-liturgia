import { handle, json } from '@/lib/api.js';
import { currentUser } from '@/lib/session.js';
import { listMembers } from '@/services/users.js';

export async function GET() {
  return handle(async () => {
    const actor = await currentUser();
    return json({ members: await listMembers(actor) });
  });
}
