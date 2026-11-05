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

describe('MemberList', () => {
  it('sem permissão na capela, só mostra o papel', () => {
    lista({ canManage: false, capelaId: 'c2' });
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('button', { name: /Tirar Maria/ })).toBeNull();
    expect(screen.getByText('Coordenador')).toBeTruthy();
  });

  it('mostra o papel da capela escolhida, não o das outras', () => {
    lista({ capelaId: 'c2' });
    expect(screen.getByRole('combobox', { name: /Papel de Maria/ }).textContent).toContain('Coordenador');
  });

  it('na lista sem capela não há coluna de papel', () => {
    lista({ capelaId: null, canManage: false, canEditAccounts: true, members: [{ ...maria, memberships: [] }] });
    expect(screen.queryByRole('columnheader', { name: 'Papel' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Editar' })).toBeTruthy();
  });

  it('coordenador não tira a si mesmo', () => {
    lista({ currentUserId: 'u1' });
    expect(screen.queryByRole('button', { name: /Tirar Maria/ })).toBeNull();
  });

  it('troca o papel naquela capela', async () => {
    const user = userEvent.setup();
    lista();
    await user.click(screen.getByRole('combobox', { name: /Papel de Maria/ }));
    await user.click(screen.getByRole('option', { name: 'Coordenador' }));

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/members/u1/role');
    expect(JSON.parse(init.body)).toEqual({ capelaId: 'c1', role: 'COORDENADOR' });
    expect(refresh).toHaveBeenCalled();
  });

  it('se a troca falhar, mostra o erro e mantém o papel anterior', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, json: async () => ({ error: 'Sem permissão.' }) }));
    const user = userEvent.setup();
    lista();
    const menu = screen.getByRole('combobox', { name: /Papel de Maria/ });
    await user.click(menu);
    await user.click(screen.getByRole('option', { name: 'Coordenador' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(menu.textContent).toContain('Músico');
  });

  it('só tira da capela depois de confirmar no modal', async () => {
    const user = userEvent.setup();
    lista();
    await user.click(screen.getByRole('button', { name: /Tirar Maria da capela/ }));

    const modal = screen.getByRole('alertdialog');
    expect(global.fetch).not.toHaveBeenCalled();
    await user.click(within(modal).getByRole('button', { name: 'Cancelar' }));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();

    await user.click(screen.getByRole('button', { name: /Tirar Maria da capela/ }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Tirar da capela' }));
    expect(global.fetch.mock.calls[0][0]).toBe('/api/members/u1/capela?capelaId=c1');
  });

  it('Esc cancela a confirmação', async () => {
    const user = userEvent.setup();
    lista();
    await user.click(screen.getByRole('button', { name: /Tirar Maria da capela/ }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('apagar conta só aparece para o dono, e nunca para a conta do dono', () => {
    lista();
    expect(screen.queryByRole('button', { name: 'Apagar conta' })).toBeNull();
    cleanup();

    lista({ canEditAccounts: true });
    expect(screen.getByRole('button', { name: 'Apagar conta' })).toBeTruthy();
    cleanup();

    lista({ canEditAccounts: true, members: [{ ...maria, isOwner: true }] });
    expect(screen.queryByRole('button', { name: 'Apagar conta' })).toBeNull();
  });
});
