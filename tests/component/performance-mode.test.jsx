// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PerformanceMode } from '@/components/PerformanceMode.jsx';

afterEach(cleanup);

const roteiro = [
  {
    id: 'i1',
    title: 'Eis-me aqui',
    composer: 'Tradicional',
    originalKey: 'G',
    chordPro: '[G]Eis-me a[C]qui',
    momentLabel: 'Entrada',
    performanceKey: 'A',
  },
  {
    id: 'i2',
    title: 'Santo',
    composer: null,
    originalKey: 'D',
    chordPro: '[D]Santo, San[A]to',
    momentLabel: 'Santo',
    performanceKey: null,
  },
];

const abrir = async (user) => user.click(screen.getByRole('button', { name: 'Modo missa' }));

describe('PerformanceMode', () => {
  it('abre a sobreposição no primeiro canto do roteiro', async () => {
    const user = userEvent.setup();
    render(<PerformanceMode songs={roteiro} />);

    expect(screen.queryByRole('dialog')).toBeNull();
    await abrir(user);

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Eis-me aqui' })).toBeTruthy();
    expect(screen.getByText('Entrada')).toBeTruthy();
    expect(screen.getByText('1 / 2')).toBeTruthy();
  });

  it('abre cada canto no tom definido para a evento', async () => {
    const user = userEvent.setup();
    render(<PerformanceMode songs={roteiro} />);
    await abrir(user);

    expect(screen.getByTestId('current-key').textContent).toBe('A');

    await user.click(screen.getByRole('button', { name: /próximo/i }));
    expect(screen.getByRole('heading', { name: 'Santo' })).toBeTruthy();
    expect(screen.getByTestId('current-key').textContent).toBe('D');
  });

  it('devolve o tom da evento ao voltar para um canto já transposto', async () => {
    const user = userEvent.setup();
    render(<PerformanceMode songs={roteiro} />);
    await abrir(user);

    await user.click(screen.getByRole('button', { name: /subir meio tom/i }));
    expect(screen.getByTestId('current-key').textContent).toBe('A#');

    await user.click(screen.getByRole('button', { name: /próximo/i }));
    await user.click(screen.getByRole('button', { name: /anterior/i }));
    expect(screen.getByTestId('current-key').textContent).toBe('A');
  });

  it('trava a navegação nas pontas do roteiro', async () => {
    const user = userEvent.setup();
    render(<PerformanceMode songs={roteiro} />);
    await abrir(user);

    expect(screen.getByRole('button', { name: /anterior/i }).disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: /próximo/i }));
    expect(screen.getByText('2 / 2')).toBeTruthy();
    expect(screen.getByRole('button', { name: /próximo/i }).disabled).toBe(true);
  });

  it('fecha pelo botão e pela tecla Esc', async () => {
    const user = userEvent.setup();
    render(<PerformanceMode songs={roteiro} />);

    await abrir(user);
    await user.click(screen.getByRole('button', { name: 'Sair' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    await abrir(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('omite a navegação quando há um canto só', async () => {
    const user = userEvent.setup();
    render(<PerformanceMode songs={[roteiro[0]]} label="Tela cheia" />);

    await user.click(screen.getByRole('button', { name: 'Tela cheia' }));
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Eis-me aqui' })).toBeTruthy();
  });

  it('alterna a cifra entre uma e duas colunas, lembrando a escolha', async () => {
    const user = userEvent.setup();
    window.localStorage.clear();
    const { unmount } = render(<PerformanceMode songs={roteiro} />);
    await abrir(user);

    expect(screen.getByRole('dialog').className).not.toMatch(/performance--colunas/);

    await user.click(screen.getByRole('button', { name: '2 colunas' }));
    expect(screen.getByRole('dialog').className).toMatch(/performance--colunas/);

    // A preferência é do músico, não da música: vale na próxima abertura.
    unmount();
    render(<PerformanceMode songs={roteiro} />);
    await abrir(user);
    expect(screen.getByRole('dialog').className).toMatch(/performance--colunas/);

    await user.click(screen.getByRole('button', { name: '1 coluna' }));
    expect(screen.getByRole('dialog').className).not.toMatch(/performance--colunas/);
  });

  it('não oferece o modo quando não há roteiro', () => {
    render(<PerformanceMode songs={[]} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
