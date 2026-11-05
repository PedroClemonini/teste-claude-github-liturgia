/**
 * Ponte entre o NextAuth e o restante da aplicação.
 *
 * Todo código de servidor pergunta "quem é o usuário?" por aqui — é o único
 * módulo que conhece o NextAuth, o que mantém serviços e rotas testáveis.
 * O ator vem sempre do banco: conta removida perde o acesso na hora, e mudanças
 * de nome, papel ou capela valem sem precisar entrar de novo.
 */
import { auth } from './auth.js';
import { findUserById } from '@/services/users.js';

/** @returns {Promise<ReturnType<typeof import('@/domain/auth/roles.js').toActor>|null>} */
export async function currentUser() {
  const session = await auth();
  const id = session?.user?.id;
  return id ? findUserById(id) : null;
}
