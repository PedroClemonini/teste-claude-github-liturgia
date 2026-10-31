import { handle, json, readJson } from '@/lib/api.js';
import { resetPassword } from '@/services/passwordReset.js';

/** Grava a nova senha a partir do token do e-mail. Rota pública, sem sessão. */
export async function POST(request) {
  return handle(async () => {
    const body = await readJson(request);
    return json(await resetPassword(body));
  });
}
