import './globals.css';
import Link from 'next/link';
import { currentUser } from '@/lib/session.js';
import { roleLabel, isAdministrator } from '@/domain/auth/roles.js';
import Image from 'next/image';
import { HeaderContent } from '@/components/HeaderContent.jsx';
import { signOutAction } from './actions.js';

export const metadata = {
  title: 'Santa Liturgia - SFX',
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
                <Image
                  src="/sfx.png"
                  alt="logo"
                  width={36}
                  height={36}
                  className="brand-logo"
                  style={{ objectFit: 'contain' }}
                />
                <span>
                  Santa Liturgia - São Francisco Xavier
                  <span className="brand-sub">"Ide pelo mundo e anunciai o evangelho a toda criatura"</span>
                </span>
              </Link>

              <HeaderContent
                user={user}
                signOutAction={signOutAction}
                isAdmin={user ? isAdministrator(user) : false}
                roleLabel={user ? roleLabel(user.role) : null}
              />
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
