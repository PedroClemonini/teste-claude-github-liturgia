// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

const { CelebrationForm } = await import('@/components/CelebrationForm.jsx');

const capelas = [
  { id: 'c1', name: 'Matriz' },
  { id: 'c2', name: 'São José' },
];
const data = () => screen.getByLabelText(/data e horário/i);

beforeEach(() => {
  push.mockClear();
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ celebration: { id: 'e1' } }) }));
});
afterEach(cleanup);

describe('CelebrationForm', () => {
  it('sugere o tempo litúrgico pelo nome, não pelo código interno', () => {
    render(<CelebrationForm capelas={capelas} />);
    fireEvent.change(data(), { target: { value: '2026-12-06T10:00' } });

    const tempo = screen.getByRole('combobox', { name: /tempo litúrgico/i });
    expect(tempo.textContent).toContain('Automático pela data (Advento)');
    expect(tempo.textContent).not.toContain('ADVENTO');
  });

  it('envia capela e tipo escolhidos nos menus', async () => {
    const user = userEvent.setup();
    render(<CelebrationForm capelas={capelas} />);
    await user.type(screen.getByLabelText(/título/i), 'Ensaio');
    fireEvent.change(data(), { target: { value: '2026-12-06T10:00' } });

    await user.click(screen.getByRole('combobox', { name: /^Capela/ }));
    await user.click(screen.getByRole('option', { name: 'São José' }));
    await user.click(screen.getByRole('combobox', { name: /^Tipo/ }));
    await user.click(screen.getByRole('option', { name: 'Ensaio' }));
    await user.click(screen.getByRole('button', { name: 'Criar evento' }));

    const corpo = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(corpo).toMatchObject({ capelaId: 'c2', type: 'ENSAIO', title: 'Ensaio' });
    expect(push).toHaveBeenCalledWith('/celebracoes/e1');
  });

  it('com uma capela só, mostra o nome em vez do menu', () => {
    render(<CelebrationForm capelas={[capelas[0]]} />);
    expect(screen.queryByRole('combobox', { name: /^Capela/ })).toBeNull();
    expect(screen.getByLabelText(/capela/i).value).toBe('Matriz');
  });
});
