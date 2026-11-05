// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let pathname = '/agenda';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

const { AppNavigation } = await import('@/components/AppNavigation.jsx');

afterEach(cleanup);

describe('AppNavigation', () => {
  it('marca a seção atual, inclusive nas telas internas de evento', () => {
    pathname = '/celebracoes/abc/roteiro';
    render(<AppNavigation />);
    expect(screen.getByRole('link', { name: 'Agenda' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Acervo' }).getAttribute('aria-current')).toBeNull();
  });

  it('não confunde seções com prefixo parecido', () => {
    pathname = '/acervos';
    render(<AppNavigation />);
    expect(screen.getByRole('link', { name: 'Acervo' }).getAttribute('aria-current')).toBeNull();
  });

  it('mostra Capelas só para o dono', () => {
    render(<AppNavigation />);
    expect(screen.queryByRole('link', { name: 'Capelas' })).toBeNull();
    cleanup();

    render(<AppNavigation isOwner />);
    expect(screen.getByRole('link', { name: 'Capelas' }).getAttribute('href')).toBe('/capelas');
  });

  it('recolhe o menu, lembra a escolha e mantém os nomes para leitores de tela', async () => {
    const user = userEvent.setup();
    render(<AppNavigation />);
    await user.click(screen.getByRole('button', { name: 'Recolher menu' }));

    expect(document.documentElement.dataset.nav).toBe('collapsed');
    expect(document.cookie).toContain('nav-recolhida=1');
    expect(screen.getByRole('link', { name: 'Agenda' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Expandir menu' }));
    expect(document.documentElement.dataset.nav).toBe('expanded');
    expect(document.cookie).toContain('nav-recolhida=0');
  });
});
