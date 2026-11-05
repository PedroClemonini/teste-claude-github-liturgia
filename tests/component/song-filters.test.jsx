// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const { SongFilters } = await import('@/components/SongFilters.jsx');

const opcoes = [
  { value: '', label: 'Todos' },
  { value: 'ENTRADA', label: 'Entrada' },
];

const filtros = (props = {}) => (
  <SongFilters
    q=""
    moment=""
    season=""
    tag=""
    momentOptions={opcoes}
    seasonOptions={[{ value: '', label: 'Todos' }]}
    tagOptions={[]}
    {...props}
  />
);

const campo = () => screen.getByRole('searchbox');

beforeEach(() => replace.mockClear());
afterEach(cleanup);

describe('SongFilters', () => {
  it('busca ao digitar, uma vez só depois da pausa', async () => {
    const user = userEvent.setup();
    render(filtros());
    await user.type(campo(), 'santo');
    expect(replace).not.toHaveBeenCalled();

    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    expect(replace).toHaveBeenCalledWith('/acervo?q=santo', { scroll: false });
  });

  it('filtro vale na hora e mantém o texto', async () => {
    const user = userEvent.setup();
    render(filtros({ q: 'santo' }));
    await user.click(screen.getByRole('combobox', { name: /Momento/ }));
    await user.click(screen.getByRole('option', { name: 'Entrada' }));
    expect(replace).toHaveBeenCalledWith('/acervo?q=santo&momento=ENTRADA', { scroll: false });
  });

  it('não apaga o que está sendo digitado se a URL chegar atrasada', async () => {
    const user = userEvent.setup();
    const { rerender } = render(filtros());
    await user.type(campo(), 'santo');
    rerender(filtros({ q: 'sa' }));
    expect(campo().value).toBe('santo');
  });

  it('acompanha a URL quando ela muda por fora, como em Limpar filtros', () => {
    const { rerender } = render(filtros({ q: 'santo', moment: 'ENTRADA' }));
    rerender(filtros());
    expect(campo().value).toBe('');
    expect(screen.getByRole('combobox', { name: /Momento/ }).textContent).toContain('Todos');
  });

  it('o botão mostra quantos filtros estão ativos e abre os filtros', async () => {
    const user = userEvent.setup();
    const { container } = render(filtros({ moment: 'ENTRADA' }));
    const botao = screen.getByRole('button', { name: 'Filtros, 1 ativo' });
    expect(container.querySelector('.ui-filters__more').dataset.open).toBeUndefined();

    await user.click(botao);
    expect(container.querySelector('.ui-filters__more').dataset.open).toBeDefined();
  });

  it('só mostra o filtro de tag quando há tags', () => {
    render(filtros());
    expect(screen.queryByRole('combobox', { name: /^Tag/ })).toBeNull();
    cleanup();
    render(filtros({ tagOptions: [{ value: '', label: 'Todas' }, { value: 'natal', label: '#natal' }] }));
    expect(screen.getByRole('combobox', { name: /^Tag/ })).toBeTruthy();
  });
});
