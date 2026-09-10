import { describe, it, expect } from 'vitest';
import {
  buildMonthGrid,
  monthLabel,
  celebrationTypeLabel,
  shiftMonth,
  monthRange,
} from '@/domain/calendar/grid.js';

describe('buildMonthGrid', () => {
  it('monta semanas completas de domingo a sábado', () => {
    const weeks = buildMonthGrid(2026, 4, []);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0][0].date.getUTCDay()).toBe(0);
  });

  it('marca os dias que não pertencem ao mês exibido', () => {
    const weeks = buildMonthGrid(2026, 4, []);
    const flat = weeks.flat();
    // Abril de 2026 começa numa quarta-feira: março invade a primeira semana.
    expect(flat[0].inMonth).toBe(false);
    expect(flat.filter((day) => day.inMonth)).toHaveLength(30);
  });

  it('distribui as celebrações no dia certo, em ordem de horário', () => {
    const weeks = buildMonthGrid(2026, 4, [
      { id: 'b', title: 'Missa da tarde', date: '2026-04-05T18:00:00.000Z' },
      { id: 'a', title: 'Missa da manhã', date: '2026-04-05T10:00:00.000Z' },
      { id: 'c', title: 'Ensaio', date: '2026-04-08T20:00:00.000Z' },
    ]);
    const flat = weeks.flat();
    const domingo = flat.find((day) => day.iso === '2026-04-05');
    expect(domingo.celebrations.map((c) => c.id)).toEqual(['a', 'b']);
    expect(flat.find((day) => day.iso === '2026-04-08').celebrations).toHaveLength(1);
    expect(flat.find((day) => day.iso === '2026-04-09').celebrations).toEqual([]);
  });

  it('informa o tempo litúrgico de cada dia', () => {
    const weeks = buildMonthGrid(2026, 4, []);
    const flat = weeks.flat();
    expect(flat.find((day) => day.iso === '2026-04-01').season).toBe('QUARESMA');
    expect(flat.find((day) => day.iso === '2026-04-05').season).toBe('PASCOA');
  });

  it('ignora celebrações de outros meses', () => {
    const weeks = buildMonthGrid(2026, 4, [{ id: 'x', date: '2026-07-01T10:00:00.000Z' }]);
    expect(weeks.flat().every((day) => day.celebrations.length === 0)).toBe(true);
  });
});

describe('monthRange', () => {
  it('devolve o intervalo que cobre o mês inteiro', () => {
    const { from, to } = monthRange(2026, 2);
    expect(from.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(to.toISOString()).toBe('2026-02-28T23:59:59.999Z');
  });
});

describe('shiftMonth', () => {
  it('avança e retrocede virando o ano', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});

describe('rótulos', () => {
  it('nomeia o mês em português', () => {
    expect(monthLabel(2026, 4)).toBe('abril de 2026');
  });

  it('nomeia os tipos de celebração', () => {
    expect(celebrationTypeLabel('MISSA_COMUM')).toBe('Missa');
    expect(celebrationTypeLabel('MISSA_SOLENE')).toBe('Missa solene');
    expect(celebrationTypeLabel('ENSAIO')).toBe('Ensaio');
  });
});
