import { handle, json, readJson } from '@/lib/api.js';
import { registerUser } from '@/services/users.js';

/** Cadastro só por convite — quem usa o link entra como Músico na capela do convite. */
export async function POST(request) {
  return handle(async () => {
    const body = await readJson(request);
    // O papel nunca vem do formulário: promover alguém é ação do coordenador.
    const user = await registerUser({ ...body, role: 'MUSICO' });
    return json({ user }, 201);
  });
}
