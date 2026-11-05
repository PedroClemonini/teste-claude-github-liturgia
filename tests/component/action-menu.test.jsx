// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionMenu } from '@/components/ActionMenu.jsx';

afterEach(cleanup);

const setup = () => {
  const editar = vi.fn();
  const apagar = vi.fn();
  render(
    <div>
      <ActionMenu
        label="Ações"
        items={[
          { label: 'Editar', onSelect: editar },
          { label: 'Apagar', onSelect: apagar, danger: true },
        ]}
      >
        menu
      </ActionMenu>
      <button>Fora</button>
    </div>,
  );
  return { user: userEvent.setup(), editar, apagar, botao: screen.getByRole('button', { name: 'Ações' }) };
};

describe('ActionMenu', () => {
  it('começa fechado e abre com o foco no primeiro item', async () => {
    const { user, botao } = setup();
    expect(screen.queryByRole('menu')).toBeNull();
    await user.click(botao);
    expect(botao.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Editar' }));
  });

  it('funciona com o teclado e fecha ao escolher', async () => {
    const { user, botao, apagar, editar } = setup();
    await user.click(botao);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(apagar).toHaveBeenCalledTimes(1);
    expect(editar).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('Esc fecha sem acionar nada e devolve o foco ao botão', async () => {
    const { user, botao, editar, apagar } = setup();
    await user.click(botao);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(botao);
    expect(editar).not.toHaveBeenCalled();
    expect(apagar).not.toHaveBeenCalled();
  });

  it('clicar fora fecha', async () => {
    const { user, botao } = setup();
    await user.click(botao);
    await user.click(screen.getByRole('button', { name: 'Fora' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
