// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SongWithFullscreen } from '@/components/SongWithFullscreen.jsx';

afterEach(cleanup);

const song = { id: 's1', title: 'Pai Nosso', composer: null, originalKey: 'G', chordPro: '[G]Pai [C]Nosso' };

const tomDa = (area) => within(area).getByTestId('current-key').textContent;

describe('SongWithFullscreen', () => {
  it('a tela cheia abre no tom que a pessoa escolheu', async () => {
    const user = userEvent.setup();
    render(<SongWithFullscreen song={song} breadcrumbs={null} />);

    await user.click(screen.getByRole('button', { name: /subir meio tom/i }));
    await user.click(screen.getByRole('button', { name: /subir meio tom/i }));
    expect(screen.getByTestId('current-key').textContent).toBe('A');

    await user.click(screen.getByRole('button', { name: 'Tela cheia' }));
    expect(tomDa(screen.getByRole('dialog'))).toBe('A');
  });

  it('o que muda na tela cheia continua valendo ao sair', async () => {
    const user = userEvent.setup();
    render(<SongWithFullscreen song={song} breadcrumbs={null} />);

    await user.click(screen.getByRole('button', { name: 'Tela cheia' }));
    const dialogo = screen.getByRole('dialog');
    await user.click(within(dialogo).getByRole('button', { name: /descer meio tom/i }));
    await user.click(within(dialogo).getByRole('button', { name: /descer meio tom/i }));
    await user.click(within(dialogo).getByRole('button', { name: 'Sair' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('current-key').textContent).toBe('F');
  });

  it('Voltar devolve as duas telas ao tom original', async () => {
    const user = userEvent.setup();
    render(<SongWithFullscreen song={song} breadcrumbs={null} />);

    await user.click(screen.getByRole('button', { name: /subir meio tom/i }));
    await user.click(screen.getByRole('button', { name: /voltar ao tom original/i }));
    await user.click(screen.getByRole('button', { name: 'Tela cheia' }));

    expect(tomDa(screen.getByRole('dialog'))).toBe('G');
  });
});
