'use client';

import Link from 'next/link';
import { MobileMenu } from './MobileMenu';

export function HeaderContent({ user, signOutAction, isAdmin, roleLabel: roleLabelText }) {
  if (!user) {
    return (
      <MobileMenu>
        <nav className="nav" aria-label="Acesso"></nav>
      </MobileMenu>
    );
  }

  return (
    <MobileMenu>
      <nav className="nav" aria-label="Seções">
        {isAdmin ? (
          <Link href="/admin">Administração</Link>
        ) : (
          <>
            <Link href="/agenda">Agenda</Link>
            <Link href="/acervo">Acervo</Link>
            <Link href="/equipe">Equipe</Link>
          </>
        )}
      </nav>
      <div className="who">
        <strong>{user.name}</strong>
        {roleLabelText}
        <form action={signOutAction}>
          <button type="submit" className="btn btn--ghost btn--small">
            Sair
          </button>
        </form>
      </div>
    </MobileMenu>
  );
}
