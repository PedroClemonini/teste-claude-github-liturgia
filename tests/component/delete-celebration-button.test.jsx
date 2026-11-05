// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

const { DeleteCelebrationButton } = await import('@/components/DeleteCelebrationButton.jsx');

const noGrupo = () =>
  render(
    <span className="ui-event-actions">
      <DeleteCelebrationButton celebrationId="e1" />
    </span>,
  );

beforeEach(() => {
  push.mockClear();
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
});
afterEach(cleanup);

describe('DeleteCelebrationButton', () => {
  it('abrir e cancelar nunca exclui', async () => {
    const user = userEvent.setup();
    noGrupo();
    await user.click(screen.getByRole('button', { name: 'Excluir evento' }));
    expect(global.fetch).not.toHaveBeenCalled();

    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('o modal fica fora do grupo de botões, longe do CSS de só ícones', async () => {
    const user = userEvent.setup();
    noGrupo();
    await user.click(screen.getByRole('button', { name: 'Excluir evento' }));
    expect(screen.getByRole('alertdialog').closest('.ui-event-actions')).toBeNull();
  });

  it('só exclui ao confirmar no modal', async () => {
    const user = userEvent.setup();
    noGrupo();
    await user.click(screen.getByRole('button', { name: 'Excluir evento' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir evento' }));

    expect(global.fetch.mock.calls[0][0]).toBe('/api/celebrations/e1');
    expect(global.fetch.mock.calls[0][1].method).toBe('DELETE');
    expect(push).toHaveBeenCalledWith('/agenda');
  });
});
