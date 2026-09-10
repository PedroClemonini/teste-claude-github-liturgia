// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SongViewer } from '@/components/SongViewer.jsx';

afterEach(cleanup);

const song = {
  title: 'Pai Nosso',
  composer: 'Tradicional',
  originalKey: 'G',
  chordPro: '[G]Pai Nosso que est[C]ais no c[G]éu',
};

const chords = () =>
  [...document.querySelectorAll('[data-testid="chord"]')].map((el) => el.textContent);

describe('SongViewer', () => {
  it('abre no tom original da cifra', () => {
    render(<SongViewer song={song} />);
    expect(screen.getByTestId('current-key').textContent).toBe('G');
    expect(chords()).toEqual(['G', 'C', 'G']);
  });

  it('sobe o tom com um clique', async () => {
    const user = userEvent.setup();
    render(<SongViewer song={song} />);

    await user.click(screen.getByRole('button', { name: /subir meio tom/i }));
    expect(screen.getByTestId('current-key').textContent).toBe('G#');
    expect(chords()).toEqual(['G#', 'C#', 'G#']);
  });

  it('desce o tom com um clique, usando bemóis', async () => {
    const user = userEvent.setup();
    render(<SongViewer song={song} />);

    await user.click(screen.getByRole('button', { name: /descer meio tom/i }));
    expect(screen.getByTestId('current-key').textContent).toBe('Gb');
    expect(chords()).toEqual(['Gb', 'B', 'Gb']);
  });

  it('acumula cliques e volta ao tom original', async () => {
    const user = userEvent.setup();
    render(<SongViewer song={song} />);
    const subir = screen.getByRole('button', { name: /subir meio tom/i });

    await user.click(subir);
    await user.click(subir);
    expect(screen.getByTestId('current-key').textContent).toBe('A');

    await user.click(screen.getByRole('button', { name: /voltar ao tom original/i }));
    expect(screen.getByTestId('current-key').textContent).toBe('G');
    expect(chords()).toEqual(['G', 'C', 'G']);
  });

  it('começa no tom definido para a celebração quando ele é informado', () => {
    render(<SongViewer song={song} performanceKey="A" />);
    expect(screen.getByTestId('current-key').textContent).toBe('A');
    expect(chords()).toEqual(['A', 'D', 'A']);
  });

  it('alterna entre cifra e somente letra', async () => {
    const user = userEvent.setup();
    render(<SongViewer song={song} />);

    await user.click(screen.getByRole('button', { name: /somente letra/i }));
    expect(chords()).toEqual([]);

    await user.click(screen.getByRole('button', { name: /mostrar cifra/i }));
    expect(chords()).toEqual(['G', 'C', 'G']);
  });

  it('mostra título, autor e o tom original como referência', () => {
    render(<SongViewer song={song} performanceKey="A" />);
    expect(screen.getByText('Pai Nosso')).toBeTruthy();
    expect(screen.getByText(/Tradicional/)).toBeTruthy();
    expect(screen.getByText(/original: G/i)).toBeTruthy();
  });
});

describe('SongViewer — cifra e tom coerentes', () => {
  it('não transpõe nada quando o tom da celebração é o próprio tom da cifra', () => {
    render(<SongViewer song={song} performanceKey="G" />);
    expect(screen.getByTestId('current-key').textContent).toBe('G');
    expect(chords()).toEqual(['G', 'C', 'G']);
  });

  it('parte sempre do tom em que a cifra recebida está escrita', () => {
    // Cifra já escrita em A: informar originalKey="A" evita transpor de novo.
    render(
      <SongViewer
        song={{ ...song, originalKey: 'A', chordPro: '[A]Pai Nosso que est[D]ais no c[A]éu' }}
        performanceKey="A"
      />,
    );
    expect(chords()).toEqual(['A', 'D', 'A']);
  });
});

describe('SongViewer embutido no roteiro', () => {
  it('omite título e momento, que já aparecem na linha do roteiro', () => {
    render(<SongViewer song={song} momentLabel="Ofertório" variant="embedded" />);

    expect(screen.queryByRole('heading', { name: 'Pai Nosso' })).toBeNull();
    expect(screen.queryByText('Ofertório')).toBeNull();
    // Os controles de tom e a cifra continuam presentes.
    expect(screen.getByTestId('current-key').textContent).toBe('G');
    expect(chords()).toEqual(['G', 'C', 'G']);
    // A referência de tom original permanece: é o que o músico precisa saber.
    expect(screen.getByText(/original: G/i)).toBeTruthy();
  });

  it('mostra título e momento na tela dedicada da música', () => {
    render(<SongViewer song={song} momentLabel="Ofertório" />);
    expect(screen.getByRole('heading', { name: 'Pai Nosso' })).toBeTruthy();
    expect(screen.getByText('Ofertório')).toBeTruthy();
  });
});
