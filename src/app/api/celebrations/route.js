import { handle, json, readJson } from '@/lib/api.js';
import { currentUser } from '@/lib/session.js';
import { createCelebration, listCelebrations } from '@/services/celebrations.js';

/** Painel de agenda: ?from= &to= &type= &season= */
export async function GET(request) {
  return handle(async () => {
    const actor = await currentUser();
    const url = new URL(request.url);
    const celebrations = await listCelebrations(
      {
        from: url.searchParams.get('from') ?? undefined,
        to: url.searchParams.get('to') ?? undefined,
        type: url.searchParams.get('type') ?? undefined,
        season: url.searchParams.get('season') ?? undefined,
      },
      actor,
    );
    return json({ celebrations });
  });
}

export async function POST(request) {
  return handle(async () => {
    const actor = await currentUser();
    const celebration = await createCelebration(await readJson(request), actor);
    return json({ celebration }, 201);
  });
}
