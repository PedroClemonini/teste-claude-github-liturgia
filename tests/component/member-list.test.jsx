// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const { MemberList } = await import('@/components/MemberList.jsx');

const maria = {
  id: 'u1',
  name: 'Maria',
  email: 'maria@x.org',
  instruments: ['Soprano'],
  isOwner: false,
  memberships: [
    { capelaId: 'c1', role: 'MUSICO', capelaName: 'Matriz' },
    { capelaId: 'c2', role: 'COORDENADOR', capelaName: 'São José' },
  ],
};

const lista = (props = {}) =>
  render(<MemberList members={[maria]} capelaId="c1" canManage currentUserId="eu" {...props} />);

beforeEach(() => {
  refresh.mockClear();
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
});
afterEach(cleanup);

const abrir = (user, nome = 'Maria') => user.click(screen.getByRole('button', { name: `Ações de ${nome}` }));
const item = (nome) => screen.getByRole('menuitem', { name: nome });

describe('MemberList', () => {
  it('o papel é só texto: nada na lista muda com um toque', () => {
    lista();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText('Músico')).toBeTruthy();
  });

  it('sem permissão, não há menu de ações', () => {
    lista({ canManage: false, capelaId: 'c2' });
    expect(screen.queryByRole('button', { name: 'Ações de Maria' })).toBeNull();
    expect(screen.getByText('Coordenador')).toBeTruthy();
  });

  it('mostra o papel da capela escolhida, não o das outras', () => {
    lista({ capelaId: 'c2' });
    expect(screen.getByText('Coordenador')).toBeTruthy();
    expect(screen.queryByText('Músico')).toBeNull();
  });

  it('na lista sem capela não há coluna de papel, mas o dono edita', async () => {
    const user = userEvent.setup();
    lista({ capelaId: null, canManage: false, canEditAccounts: true, members: [{ ...maria, memberships: [] }] });
    expect(screen.queryByRole('columnheader', { name: 'Papel' })).toBeNull();
    await abrir(user);
    expect(item('Editar').getAttribute('href')).toBe('/capelas/membros/u1/editar');
  });

  it('coordenador troca o papel, mas não tira a si mesmo', async () => {
    const user = userEvent.setup();
    lista({ currentUserId: 'u1' });
    await abrir(user);
    expect(screen.queryByRole('menuitem', { name: 'Tirar da capela' })).toBeNull();
    expect(item('Tornar Coordenador')).toBeTruthy();
  });

  it('coordenador não vê editar nem apagar conta', async () => {
    const user = userEvent.setup();
    lista();
    await abrir(user);
    expect(screen.queryByRole('menuitem', { name: 'Editar' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Apagar conta' })).toBeNull();
  });

  it('trocar o papel pede confirmação, e só então grava', async () => {
    const user = userEvent.setup();
    lista();
    await abrir(user);
    await user.click(item('Tornar Coordenador'));
    expect(global.fetch).not.toHaveBeenCalled();

    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Tornar Coordenador' }));
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/members/u1/role');
    expect(JSON.parse(init.body)).toEqual({ capelaId: 'c1', role: 'COORDENADOR' });
    expect(refresh).toHaveBeenCalled();
  });

  it('se a troca falhar, mostra o erro e mantém o papel', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, json: async () => ({ error: 'Sem permissão.' }) }));
    const user = userEvent.setup();
    lista();
    await abrir(user);
    await user.click(item('Tornar Coordenador'));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Tornar Coordenador' }));

    expect(await screen.findByText('Sem permissão.')).toBeTruthy();
    expect(screen.getByText('Músico')).toBeTruthy();
  });

  it('só tira da capela depois de confirmar no modal', async () => {
    const user = userEvent.setup();
    lista();
    await abrir(user);
    await user.click(item('Tirar da capela'));

    const modal = screen.getByRole('alertdialog');
    await user.click(within(modal).getByRole('button', { name: 'Cancelar' }));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();

    await abrir(user);
    await user.click(item('Tirar da capela'));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Tirar da capela' }));
    expect(global.fetch.mock.calls[0][0]).toBe('/api/members/u1/capela?capelaId=c1');
  });

  it('Esc cancela a confirmação', async () => {
    const user = userEvent.setup();
    lista();
    await abrir(user);
    await user.click(item('Tirar da capela'));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('apagar conta é do dono, e nunca da conta do dono', async () => {
    const user = userEvent.setup();
    lista({ canEditAccounts: true });
    await abrir(user);
    expect(item('Apagar conta').className).toContain('danger');
    cleanup();

    lista({ canEditAccounts: true, members: [{ ...maria, isOwner: true }] });
    await abrir(user);
    expect(screen.queryByRole('menuitem', { name: 'Apagar conta' })).toBeNull();
  });
});
