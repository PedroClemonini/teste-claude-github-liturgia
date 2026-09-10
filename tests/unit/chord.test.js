import { describe, it, expect } from 'vitest';
import { parseChord, formatChord, isChord } from '@/domain/chordpro/chord.js';

describe('parseChord', () => {
  it('lê uma tríade maior simples', () => {
    expect(parseChord('G')).toEqual({ root: 'G', suffix: '', bass: null });
  });

  it('lê acidentes de sustenido e bemol', () => {
    expect(parseChord('F#')).toMatchObject({ root: 'F#', suffix: '' });
    expect(parseChord('Bb')).toMatchObject({ root: 'Bb', suffix: '' });
  });

  it('preserva o sufixo da cifra', () => {
    expect(parseChord('C#m7')).toEqual({ root: 'C#', suffix: 'm7', bass: null });
    expect(parseChord('F#m7(b5)')).toEqual({ root: 'F#', suffix: 'm7(b5)', bass: null });
    expect(parseChord('A7M')).toEqual({ root: 'A', suffix: '7M', bass: null });
    expect(parseChord('Dsus4')).toEqual({ root: 'D', suffix: 'sus4', bass: null });
  });

  it('lê o baixo invertido depois da barra', () => {
    expect(parseChord('Bb/D')).toEqual({ root: 'Bb', suffix: '', bass: 'D' });
    expect(parseChord('G7/B')).toEqual({ root: 'G', suffix: '7', bass: 'B' });
  });

  it('devolve null para o que não é acorde', () => {
    expect(parseChord('Refrão')).toBeNull();
    expect(parseChord('')).toBeNull();
    expect(parseChord('H')).toBeNull();
  });
});

describe('formatChord', () => {
  it('reconstrói a cifra a partir das partes', () => {
    expect(formatChord({ root: 'Bb', suffix: 'm7', bass: 'Db' })).toBe('Bbm7/Db');
    expect(formatChord({ root: 'G', suffix: '', bass: null })).toBe('G');
  });
});

describe('isChord', () => {
  it('distingue acorde de anotação livre', () => {
    expect(isChord('Am')).toBe(true);
    expect(isChord('2x')).toBe(false);
  });
});
