// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const { RepertoireBuilder } = await import('@/components/RepertoireBuilder.jsx');

const songs = [
  { id: 's1', title: 'Santo', originalKey: 'C', moments: ['SANTO'] },
  { id: 's2', title: 'Pai Nosso', originalKey: 'G', moments: ['COMUNHAO'] },
];

const menu = (nome) => screen.getByRole('combobox', { name: new RegExp(`Música para ${nome}`) });
const tom = (nome) => screen.getByRole('textbox', { name: `Tom para ${nome}` });

beforeEach(() => {
  refresh.mockClear();
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
});
afterEach(cleanup);

describe('RepertoireBuilder', () => {
  it('indica primeiro as músicas marcadas para o momento', async () => {
    const user = userEvent.setup();
    render(<RepertoireBuilder celebrationId="c1" songs={songs} initial={[]} />);
    await user.click(menu('Santo'));

    const opcoes = screen.getAllByRole('option').map((option) => option.textContent);
    expect(opcoes).toEqual(['Sem canto', 'Santo (C)', 'Pai Nosso (G)']);
    expect(screen.getByText('Indicadas para Santo')).toBeTruthy();
  });

  it('só libera o tom depois de escolher a música, e sugere o original', async () => {
    const user = userEvent.setup();
    render(<RepertoireBuilder celebrationId="c1" songs={songs} initial={[]} />);
    expect(tom('Santo').disabled).toBe(true);

    await user.click(menu('Santo'));
    await user.click(screen.getByRole('option', { name: 'Santo (C)' }));

    expect(tom('Santo').disabled).toBe(false);
    expect(tom('Santo').placeholder).toBe('C');
  });

  it('salva só os momentos com música, com o tom escolhido', async () => {
    const user = userEvent.setup();
    render(<RepertoireBuilder celebrationId="c1" songs={songs} initial={[]} />);
    await user.click(menu('Santo'));
    await user.click(screen.getByRole('option', { name: 'Santo (C)' }));
    await user.type(tom('Santo'), 'D');
    await user.click(screen.getByRole('button', { name: 'Salvar roteiro' }));

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/celebrations/c1/repertoire');
    expect(JSON.parse(init.body).items).toEqual([{ moment: 'SANTO', songId: 's1', position: 0, keyOverride: 'D' }]);
    expect(await screen.findByRole('status')).toBeTruthy();
  });

  it('voltar para Sem canto limpa o tom daquele momento', async () => {
    const user = userEvent.setup();
    render(
      <RepertoireBuilder
        celebrationId="c1"
        songs={songs}
        initial={[{ moment: 'SANTO', songId: 's1', keyOverride: 'D', position: 0 }]}
      />,
    );
    await user.click(menu('Santo'));
    await user.click(screen.getByRole('option', { name: 'Sem canto' }));
    expect(tom('Santo').value).toBe('');
  });
});
