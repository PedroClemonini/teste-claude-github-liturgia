// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AgendaList, CalendarBoard } from '@/components/CalendarBoard.jsx';

afterEach(cleanup);

describe('CalendarBoard', () => {
  it('mostra o ponto da cor litúrgica em todos os dias da grade', () => {
    const { container } = render(<CalendarBoard year={2026} month={11} celebrations={[]} />);
    const dias = container.querySelectorAll('.calendar-day');
    expect(dias.length).toBeGreaterThanOrEqual(28);
    dias.forEach((dia) => expect(dia.querySelector('.cor-dot')).toBeTruthy());
  });

  it('usa a cor da liturgia guardada, e a do tempo litúrgico nos demais dias', () => {
    const { container } = render(
      <CalendarBoard
        year={2026}
        month={11}
        celebrations={[]}
        liturgyColors={{ '2026-11-04': { cor: 'Branco', liturgia: 'São Carlos Borromeu' } }}
      />,
    );
    const dia = (titulo) => container.querySelector(`[title="${titulo}"] .cor-dot`);

    expect(dia('São Carlos Borromeu').dataset.cor).toBe('Branco');
    expect(dia('Tempo Comum').dataset.cor).toBe('Verde');
    expect(dia('Advento').dataset.cor).toBe('Roxo');
  });

  it('escreve o nome do tempo só onde ele começa na grade', () => {
    const { container } = render(<CalendarBoard year={2026} month={11} celebrations={[]} />);
    const nomes = [...container.querySelectorAll('.calendar-day-season__label')].map((el) => el.textContent);
    expect(nomes).toEqual(['Tempo Comum', 'Advento']);
  });
});

describe('AgendaList', () => {
  const evento = (extra = {}) => ({
    id: 'e1',
    title: 'Missa',
    date: '2026-11-08T10:00:00.000Z',
    type: 'MISSA_COMUM',
    season: 'TEMPO_COMUM',
    ...extra,
  });

  it('esconde a contagem de cantos quando é zero', () => {
    render(<AgendaList celebrations={[evento({ songCount: 0 })]} />);
    expect(screen.queryByText(/cantos?/)).toBeNull();
  });

  it('mostra a contagem quando há cantos', () => {
    render(<AgendaList celebrations={[evento({ songCount: 1 })]} />);
    expect(screen.getByText(/1 canto/)).toBeTruthy();
  });

  it('cada item leva ao evento e tem a seta de abrir', () => {
    const { container } = render(<AgendaList celebrations={[evento()]} />);
    expect(screen.getByRole('link').getAttribute('href')).toBe('/celebracoes/e1');
    expect(container.querySelector('.ui-list-item > svg')).toBeTruthy();
  });

  it('só mostra o tempo litúrgico quando foge do tempo atual', () => {
    render(
      <AgendaList
        currentSeason="TEMPO_COMUM"
        celebrations={[
          evento(),
          evento({ id: 'e2', title: 'Advento', date: '2026-11-29T10:00:00.000Z', season: 'ADVENTO' }),
        ]}
      />,
    );
    expect(screen.queryByText(/Tempo Comum/)).toBeNull();
    expect(screen.getByText(/· Advento/)).toBeTruthy();
  });

  it('na vigília mostra o tempo da liturgia seguida', () => {
    render(<AgendaList celebrations={[evento({ date: '2026-11-28T19:00:00.000Z' })]} />);
    expect(screen.getByText(/Advento/)).toBeTruthy();
  });
});
