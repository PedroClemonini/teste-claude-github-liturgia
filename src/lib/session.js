/**
 * Ponte entre o NextAuth e o restante da aplicação.
 *
 * Todo código de servidor pergunta "quem é o usuário?" por aqui — é o único
 * módulo que conhece o NextAuth, o que mantém serviços e rotas testáveis.
 */
import { auth } from './auth.js';

/** @returns {Promise<{id: string, name: string, email: string, role: string, voiceOrInstrument: string}|null>} */
export async function currentUser() {
  const session = await auth();
  return session?.user ?? null;
}
