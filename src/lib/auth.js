/**
 * Login seguro com NextAuth (Auth.js).
 *
 * A sessão é um JWT assinado que só identifica o usuário: papéis e capelas são
 * lidos do banco a cada requisição (veja session.js), para que uma mudança de
 * vínculo valha na hora. A senha nunca sai do servidor: é comparada com o hash
 * pelo serviço de usuários.
 */
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authenticate } from '@/services/users.js';

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  pages: { signIn: '/entrar' },
  providers: [
    Credentials({
      name: 'E-mail e senha',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      authorize: async (credentials) => {
        const user = await authenticate({
          email: credentials?.email,
          password: credentials?.password,
        });
        if (!user) return null;
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    session({ session, token }) {
      session.user.id = token.sub;
      return session;
    },
  },
});
