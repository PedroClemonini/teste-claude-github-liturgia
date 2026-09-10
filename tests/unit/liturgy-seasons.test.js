import { describe, it, expect } from 'vitest';
import {
  easterSunday,
  ashWednesday,
  pentecost,
  baptismOfTheLord,
  firstSundayOfAdvent,
  seasonForDate,
  LITURGICAL_SEASONS,
  seasonLabel,
} from '@/domain/liturgy/seasons.js';

const utc = (iso) => new Date(`${iso}T12:00:00.000Z`);

describe('datas móveis', () => {
  it('calcula o Domingo de Páscoa', () => {
    expect(easterSunday(2024).toISOString().slice(0, 10)).toBe('2024-03-31');
    expect(easterSunday(2025).toISOString().slice(0, 10)).toBe('2025-04-20');
    expect(easterSunday(2026).toISOString().slice(0, 10)).toBe('2026-04-05');
    expect(easterSunday(2027).toISOString().slice(0, 10)).toBe('2027-03-28');
  });

  it('calcula a Quarta-feira de Cinzas 46 dias antes da Páscoa', () => {
    expect(ashWednesday(2026).toISOString().slice(0, 10)).toBe('2026-02-18');
    expect(ashWednesday(2025).toISOString().slice(0, 10)).toBe('2025-03-05');
  });

  it('calcula Pentecostes 49 dias após a Páscoa', () => {
    expect(pentecost(2026).toISOString().slice(0, 10)).toBe('2026-05-24');
  });

  it('calcula o Batismo do Senhor, primeiro domingo depois de 6 de janeiro', () => {
    expect(baptismOfTheLord(2026).toISOString().slice(0, 10)).toBe('2026-01-11');
    expect(baptismOfTheLord(2025).toISOString().slice(0, 10)).toBe('2025-01-12');
  });

  it('calcula o primeiro domingo do Advento, quatro domingos antes do Natal', () => {
    expect(firstSundayOfAdvent(2026).toISOString().slice(0, 10)).toBe('2026-11-29');
    expect(firstSundayOfAdvent(2025).toISOString().slice(0, 10)).toBe('2025-11-30');
  });
});

describe('seasonForDate', () => {
  it('reconhece o Advento até a véspera do Natal', () => {
    expect(seasonForDate(utc('2026-11-29'))).toBe('ADVENTO');
    expect(seasonForDate(utc('2026-12-24'))).toBe('ADVENTO');
  });

  it('reconhece o Tempo do Natal até o Batismo do Senhor', () => {
    expect(seasonForDate(utc('2026-12-25'))).toBe('NATAL');
    expect(seasonForDate(utc('2026-01-06'))).toBe('NATAL');
    expect(seasonForDate(utc('2026-01-11'))).toBe('NATAL');
  });

  it('reconhece a Quaresma das Cinzas à Quarta-feira Santa', () => {
    expect(seasonForDate(utc('2026-02-18'))).toBe('QUARESMA');
    expect(seasonForDate(utc('2026-04-01'))).toBe('QUARESMA');
  });

  it('reconhece o Tríduo Pascal', () => {
    expect(seasonForDate(utc('2026-04-02'))).toBe('TRIDUO_PASCAL');
    expect(seasonForDate(utc('2026-04-04'))).toBe('TRIDUO_PASCAL');
  });

  it('reconhece o Tempo Pascal, da Páscoa a Pentecostes', () => {
    expect(seasonForDate(utc('2026-04-05'))).toBe('PASCOA');
    expect(seasonForDate(utc('2026-05-24'))).toBe('PASCOA');
  });

  it('reconhece o Tempo Comum nos dois trechos do ano', () => {
    expect(seasonForDate(utc('2026-01-12'))).toBe('TEMPO_COMUM');
    expect(seasonForDate(utc('2026-02-17'))).toBe('TEMPO_COMUM');
    expect(seasonForDate(utc('2026-05-25'))).toBe('TEMPO_COMUM');
    expect(seasonForDate(utc('2026-11-28'))).toBe('TEMPO_COMUM');
  });

  it('aceita string ISO além de Date', () => {
    expect(seasonForDate('2026-04-05')).toBe('PASCOA');
  });
});

describe('catálogo de tempos', () => {
  it('expõe os seis tempos com rótulo em português', () => {
    expect(LITURGICAL_SEASONS).toHaveLength(6);
    expect(seasonLabel('TRIDUO_PASCAL')).toBe('Tríduo Pascal');
    expect(seasonLabel('TEMPO_COMUM')).toBe('Tempo Comum');
  });
});
