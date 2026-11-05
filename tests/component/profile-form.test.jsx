// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const { ProfileForm } = await import('@/components/ProfileForm.jsx');

const user = { name: 'Maria', email: 'maria@x.org', instruments: ['Soprano'] };
const responde = (ok, body) => {
  global.fetch = vi.fn(async () => ({ ok, json: async () => body }));
};
const senhaAtual = () => screen.queryByLabelText(/senha atual/i);

beforeEach(() => {
  refresh.mockClear();
  responde(true, { user: { ...user, email: 'nova@x.org' } });
});
afterEach(cleanup);

describe('ProfileForm', () => {
  it('só pede a senha atual ao trocar e-mail ou senha', async () => {
    const ator = userEvent.setup();
    render(<ProfileForm user={user} />);
    expect(senhaAtual()).toBeNull();

    await ator.type(screen.getByLabelText(/^nome/i), ' Silva');
    expect(senhaAtual()).toBeNull();

    await ator.type(screen.getByLabelText(/e-mail/i), 'm');
    expect(senhaAtual()).toBeTruthy();
  });

  it('e-mail só com maiúsculas diferentes não pede senha', async () => {
    const ator = userEvent.setup();
    render(<ProfileForm user={user} />);
    const email = screen.getByLabelText(/e-mail/i);
    await ator.clear(email);
    await ator.type(email, 'MARIA@X.ORG');
    expect(senhaAtual()).toBeNull();
  });

  it('salva, limpa as senhas e avisa', async () => {
    const ator = userEvent.setup();
    render(<ProfileForm user={user} />);
    await ator.type(screen.getByLabelText(/nova senha/i), 'novaSenha123');
    await ator.type(senhaAtual(), 'senhaAtual1');
    await ator.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByRole('status')).toBeTruthy();
    const corpo = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(corpo).toMatchObject({ newPassword: 'novaSenha123', currentPassword: 'senhaAtual1' });
    expect(screen.getByLabelText(/nova senha/i).value).toBe('');
    expect(refresh).toHaveBeenCalled();
  });

  it('mostra o erro no campo e não avisa sucesso', async () => {
    responde(false, { error: 'Confira a senha atual.', details: { currentPassword: 'Senha atual incorreta.' } });
    const ator = userEvent.setup();
    render(<ProfileForm user={user} />);
    await ator.type(screen.getByLabelText(/nova senha/i), 'novaSenha123');
    await ator.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Senha atual incorreta.')).toBeTruthy();
    expect(senhaAtual().getAttribute('aria-invalid')).toBe('true');
    expect(screen.queryByRole('status')).toBeNull();
  });
});
