'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icon.jsx';

const TOGGLE_OPEN = 'sidebar-expand';
const TOGGLE_CLOSE = 'sidebar-collapse';

const ITEMS = [
  { href: '/agenda', label: 'Agenda', icon: 'calendar', prefixes: ['/agenda', '/celebracoes'] },
  { href: '/acervo', label: 'Acervo', icon: 'audio' },
  { href: '/equipe', label: 'Equipe', icon: 'people-group' },
  { href: '/capelas', label: 'Capelas', icon: 'office-building', ownerOnly: true },
  { href: '/perfil', label: 'Perfil', icon: 'person' },
];

function isActive(item, pathname) {
  return (item.prefixes ?? [item.href]).some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const COOKIE = 'nav-recolhida';
const UM_ANO = 60 * 60 * 24 * 365;

/**
 * Navegação principal: barra inferior no celular e menu lateral em telas
 * largas (quem decide é o CSS, o conteúdo é o mesmo). No computador o menu pode
 * ser recolhido: a escolha fica em cookie para o servidor já desenhar a página
 * certa, sem piscar ao carregar.
 *
 * @param {{isOwner?: boolean, collapsed?: boolean}} props
 */
export function AppNavigation({ isOwner = false, collapsed: initialCollapsed = false }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const alternar = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.documentElement.dataset.nav = next ? 'collapsed' : 'expanded';
    document.cookie = `${COOKIE}=${next ? '1' : '0'}; path=/; max-age=${UM_ANO}; samesite=lax`;
  };

  return (
    <nav className="ui-nav" aria-label="Seções">
      {ITEMS.filter((item) => !item.ownerOnly || isOwner).map((item) => {
        const active = isActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="ui-nav__item"
            title={collapsed ? item.label : undefined}
            aria-current={active ? 'page' : undefined}
          >
            <Icon name={item.icon} />
            <span className="ui-nav__label">{item.label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        className="ui-nav__item ui-nav__toggle"
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        onClick={alternar}
      >
        <Icon name={collapsed ? TOGGLE_OPEN : TOGGLE_CLOSE} />
        <span className="ui-nav__label">Recolher menu</span>
      </button>
    </nav>
  );
}
