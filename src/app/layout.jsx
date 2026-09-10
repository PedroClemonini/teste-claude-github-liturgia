import './globals.css';
import Link from 'next/link';
import { currentUser } from '@/lib/session.js';
import { signOut } from '@/lib/auth.js';
import { roleLabel } from '@/domain/auth/roles.js';

export const metadata = {
  title: 'Coral Litúrgico',
  description: 'Calendário, escalas e cifras para corais católicos.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#6b2d5b',
};

export default async function RootLayout({ children }) {
  const user = await currentUser();

  return (
    <html lang="pt-BR">
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="topbar-inner">
              <Link href="/" className="brand">
                Coral Litúrgico
                <span>calendário, escalas e cifras</span>
              </Link>

              {user ? (
                <>
                  <nav className="nav" aria-label="Seções">
                    <Link href="/agenda">Agenda</Link>
                    <Link href="/acervo">Acervo</Link>
                    <Link href="/equipe">Equipe</Link>
                  </nav>
                  <div className="who">
                    <strong>{user.name}</strong>
                    {roleLabel(user.role)}
                    {user.voiceOrInstrument ? ` · ${user.voiceOrInstrument}` : ''}
                    <form
                      action={async () => {
                        'use server';
                        await signOut({ redirectTo: '/entrar' });
                      }}
                    >
                      <button type="submit" className="btn btn--ghost btn--small">
                        Sair
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <nav className="nav" aria-label="Acesso">
                  <Link href="/entrar">Entrar</Link>
                  <Link href="/cadastro">Criar conta</Link>
                </nav>
              )}
            </div>
          </header>

          <main className="main">{children}</main>

          <footer className="footer">
            Feito para servir à liturgia — cifras em ChordPro, sem PDF.
          </footer>
        </div>
      </body>
    </html>
  );
}
