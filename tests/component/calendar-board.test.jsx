// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { CalendarBoard } from '@/components/CalendarBoard.jsx';

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
