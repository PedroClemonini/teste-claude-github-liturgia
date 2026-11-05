import { describe, it, expect } from 'vitest';
import { formatTag, matchingTags, normalizeTag, normalizeTags } from '@/domain/songs/tags.js';

describe('normalizeTag', () => {
  it('tira #, acentos, espaços e maiúsculas', () => {
    expect(normalizeTag('#Novena São Francisco')).toBe('novenasaofrancisco');
    expect(normalizeTag('#novenasaofrancisco')).toBe('novenasaofrancisco');
    expect(normalizeTag('Coroação de Nossa Senhora!')).toBe('coroacaodenossasenhora');
  });

  it('o que sobra vazio não é tag', () => {
    expect(normalizeTags(['#', '  ', '!!'])).toEqual([]);
  });
});

describe('normalizeTags', () => {
  it('remove repetições, mantendo a ordem', () => {
    expect(normalizeTags(['Bênção', 'natal', 'BENCAO'])).toEqual(['bencao', 'natal']);
  });
});

describe('matchingTags', () => {
  const tags = ['novenadenatal', 'novenasaofrancisco', 'pascoa'];

  it('encontra por pedaço do nome, com ou sem #', () => {
    expect(matchingTags(tags, '#novena')).toEqual(['novenadenatal', 'novenasaofrancisco']);
    expect(matchingTags(tags, 'são francisco')).toEqual(['novenasaofrancisco']);
  });

  it('termo vazio não casa com nada', () => {
    expect(matchingTags(tags, '#')).toEqual([]);
  });
});

describe('formatTag', () => {
  it('mostra com #', () => {
    expect(formatTag('natal')).toBe('#natal');
  });
});
