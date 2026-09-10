import { handle, json, readJson } from '@/lib/api.js';
import { currentUser } from '@/lib/session.js';
import {
  deleteCelebration,
  getCelebration,
  updateCelebration,
} from '@/services/celebrations.js';

export async function GET(request, { params }) {
  return handle(async () => {
    const actor = await currentUser();
    const { id } = await params;
    return json({ celebration: await getCelebration(id, actor) });
  });
}

export async function PUT(request, { params }) {
  return handle(async () => {
    const actor = await currentUser();
    const { id } = await params;
    return json({ celebration: await updateCelebration(id, await readJson(request), actor) });
  });
}

export async function DELETE(request, { params }) {
  return handle(async () => {
    const actor = await currentUser();
    const { id } = await params;
    return json(await deleteCelebration(id, actor));
  });
}
