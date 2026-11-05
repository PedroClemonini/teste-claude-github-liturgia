// @vitest-environment jsdom
import { useState } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '@/components/Modal.jsx';
import { Select } from '@/components/Select.jsx';

afterEach(cleanup);

const opcoes = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
];

describe('Modal', () => {
  it('Esc fecha mesmo quando o botão com foco deixou de existir', async () => {
    const onClose = vi.fn();
    function Conteudo() {
      const [visivel, setVisivel] = useState(true);
      return visivel ? <button onClick={() => setVisivel(false)}>Revogar</button> : <p>Nada</p>;
    }
    const user = userEvent.setup();
    render(
      <Modal title="Convites" onClose={onClose}>
        <Conteudo />
      </Modal>,
    );
    await user.click(screen.getByRole('button', { name: 'Revogar' }));
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('com um menu aberto, Esc fecha só o menu; o segundo fecha o modal', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal title="Novo usuário" onClose={onClose}>
        <Select label="Papel" name="papel" options={opcoes} />
      </Modal>,
    );
    screen.getByRole('combobox').focus();
    await user.keyboard('{ArrowDown}{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('devolve o foco a quem abriu', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const { unmount } = render(
      <Modal title="X" onClose={() => {}}>
        <p>oi</p>
      </Modal>,
    );
    expect(document.activeElement).not.toBe(opener);
    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('clicar fora fecha, clicar dentro não', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal title="X" onClose={onClose}>
        <p>conteúdo</p>
      </Modal>,
    );
    await user.click(screen.getByText('conteúdo'));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(document.querySelector('.ui-blanket'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
