import './globals.css';
import './atlassian.css';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Image from 'next/image';
import { currentUser } from '@/lib/session.js';
import { actorLabel, isOwner } from '@/domain/auth/roles.js';
import { AppNavigation } from '@/components/AppNavigation.jsx';
import { Icon } from '@/components/Icon.jsx';
import { signOutAction } from './actions.js';

export const metadata = {
  title: 'Santa Liturgia - SFX',
  description: 'Calendário, escalas e cifras para corais católicos.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default async function RootLayout({ children }) {
  const user = await currentUser();
  const navCollapsed = (await cookies()).get('nav-recolhida')?.value === '1';

  return (
    <html lang="pt-BR" data-nav={navCollapsed ? 'collapsed' : 'expanded'}>
      <body>
        <div className={user ? 'ui-shell ui-shell--nav' : 'ui-shell'}>
          <header className="ui-top-nav">
            <Link href="/" className="ui-brand">
              <Image src="/sfx.png" alt="" width={28} height={28} style={{ objectFit: 'contain' }} />
              <span className="ui-brand__text">
                Santa Liturgia
                <span className="ui-brand__sub">São Francisco Xavier</span>
              </span>
            </Link>

            {user && (
              <div className="ui-account">
                <span className="ui-avatar" aria-hidden="true">
                  {user.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="ui-account__text">
                  {user.name}
                  <small>{actorLabel(user)}</small>
                </span>
                <form action={signOutAction}>
                  <button type="submit" className="ui-button ui-button--icon" aria-label="Sair" title="Sair">
                    <Icon name="log-out" />
                  </button>
                </form>
              </div>
            )}
          </header>

          {user && <AppNavigation isOwner={isOwner(user)} collapsed={navCollapsed} />}

          <main className="main">{children}</main>

          <footer className="footer">
            Feito para servir à liturgia — cifras em ChordPro, sem PDF.
          </footer>
        </div>
      </body>
    </html>
  );
}
