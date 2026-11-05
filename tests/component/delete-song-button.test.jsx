// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const { DeleteSongButton } = await import('@/components/DeleteSongButton.jsx');

beforeEach(() => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
});
afterEach(cleanup);

const abrir = async (user) => {
  await user.click(screen.getByRole('button', { name: 'Mais ações' }));
  await user.click(screen.getByRole('menuitem', { name: 'Remover do acervo' }));
};

describe('DeleteSongButton', () => {
  it('remover fica dentro do menu, com confirmação', async () => {
    const user = userEvent.setup();
    render(<DeleteSongButton songId="s1" title="Santo" />);
    expect(screen.queryByRole('button', { name: 'Remover do acervo' })).toBeNull();

    await abrir(user);
    expect(global.fetch).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
    expect(global.fetch).not.toHaveBeenCalled();

    await abrir(user);
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remover do acervo' }));
    expect(global.fetch.mock.calls[0][1].method).toBe('DELETE');
  });
});
