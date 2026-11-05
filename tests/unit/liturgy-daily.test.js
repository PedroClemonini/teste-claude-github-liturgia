import { describe, it, expect } from 'vitest';
import {
  addDaysIso,
  daysUntilYearEnd,
  isIsoDate,
  isSaturdayMass,
  liturgyChoiceFor,
  liturgyDateFor,
  liturgySchema,
  sortCelebrations,
  todayInBrazil,
} from '@/domain/liturgy/daily.js';

describe('todayInBrazil', () => {
  it('não vira o dia às 21h, como aconteceria em UTC', () => {
    expect(todayInBrazil(new Date('2026-11-05T02:30:00.000Z'))).toBe('2026-11-04');
    expect(todayInBrazil(new Date('2026-11-05T03:30:00.000Z'))).toBe('2026-11-05');
  });
});

describe('isIsoDate', () => {
  it('aceita só datas reais em AAAA-MM-DD', () => {
    expect(isIsoDate('2026-11-04')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('04/11/2026')).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
    expect(isIsoDate(['2026-11-04'])).toBe(false);
  });
});

describe('addDaysIso e daysUntilYearEnd', () => {
  it('atravessa mês e ano', () => {
    expect(addDaysIso('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDaysIso('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('lista de amanhã até 31/12', () => {
    const days = daysUntilYearEnd('2026-12-28');
    expect(days).toEqual(['2026-12-29', '2026-12-30', '2026-12-31']);
  });

  it('em 31/12 não há o que completar', () => {
    expect(daysUntilYearEnd('2026-12-31')).toEqual([]);
  });
});

describe('liturgySchema', () => {
  const base = { id: 'a', liturgia: 'Domingo', cor: 'Verde', principal: true };

  it('aceita campos opcionais ausentes', () => {
    const parsed = liturgySchema.parse({ data: '08/11/2026', celebracoes: [base] });
    expect(parsed.celebracoes[0].leituras).toEqual([]);
    expect(parsed.celebracoes[0].oracoes.extras).toEqual([]);
  });

  it('recusa resposta sem celebração', () => {
    expect(liturgySchema.safeParse({ data: 'x', celebracoes: [] }).success).toBe(false);
    expect(liturgySchema.safeParse({ erro: 'x' }).success).toBe(false);
  });
});

describe('sortCelebrations', () => {
  it('põe a principal primeiro', () => {
    const lista = [{ id: 'b', principal: false }, { id: 'a', principal: true }];
    expect(sortCelebrations(lista).map((item) => item.id)).toEqual(['a', 'b']);
  });
});

describe('missa de sábado', () => {
  const missa = (date, extra = {}) => ({ date: new Date(date), type: 'MISSA_COMUM', liturgyChoice: null, ...extra });

  it('até as 16h59 segue o sábado', () => {
    const sabado = missa('2026-11-07T16:59:00.000Z');
    expect(liturgyChoiceFor(sabado)).toBe('SABADO');
    expect(liturgyDateFor(sabado)).toBe('2026-11-07');
  });

  it('das 17h em diante segue o domingo', () => {
    const vespera = missa('2026-11-07T17:00:00.000Z');
    expect(liturgyChoiceFor(vespera)).toBe('DOMINGO');
    expect(liturgyDateFor(vespera)).toBe('2026-11-08');
  });

  it('a escolha gravada vence o horário, nos dois sentidos', () => {
    expect(liturgyDateFor(missa('2026-11-07T19:00:00.000Z', { liturgyChoice: 'SABADO' }))).toBe('2026-11-07');
    expect(liturgyDateFor(missa('2026-11-07T08:00:00.000Z', { liturgyChoice: 'DOMINGO' }))).toBe('2026-11-08');
  });

  it('funciona na virada do ano', () => {
    expect(liturgyDateFor(missa('2033-12-31T19:00:00.000Z'))).toBe('2034-01-01');
  });

  it('não se aplica a ensaio nem a outros dias', () => {
    expect(isSaturdayMass(missa('2026-11-07T19:00:00.000Z', { type: 'ENSAIO' }))).toBe(false);
    expect(liturgyChoiceFor(missa('2026-11-08T19:00:00.000Z'))).toBeNull();
    expect(liturgyDateFor(missa('2026-11-08T19:00:00.000Z'))).toBe('2026-11-08');
  });
});
