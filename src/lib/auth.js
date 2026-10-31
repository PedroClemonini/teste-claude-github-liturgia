/**
 * Login seguro com NextAuth (Auth.js).
 *
 * A sessão é um JWT assinado que carrega o papel do usuário, de modo que
 * páginas e rotas saibam o que ele pode fazer sem uma consulta extra ao banco.
 * A senha nunca sai do servidor: é comparada com o hash pelo serviço de
 * usuários.
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
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          voiceOrInstrument: user.voiceOrInstrument,
          capelaId: user.capelaId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.voiceOrInstrument = user.voiceOrInstrument;
        token.capelaId = user.capelaId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub;
      session.user.role = token.role;
      session.user.voiceOrInstrument = token.voiceOrInstrument;
      session.user.capelaId = token.capelaId;
      return session;
    },
  },
});
