import { handle, json, readJson } from '@/lib/api.js';
import { requestPasswordReset } from '@/services/passwordReset.js';

/** Pede o e-mail com o link de redefinição. Rota pública, sem sessão. */
export async function POST(request) {
  return handle(async () => {
    const body = await readJson(request);
    return json(await requestPasswordReset(body));
  });
}
