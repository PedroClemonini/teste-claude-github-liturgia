import { describe, it, expect } from 'vitest';
import {
  parseChordPro,
  extractPlainLyrics,
  extractKey,
  groupIntoWords,
} from '@/domain/chordpro/parse.js';

describe('parseChordPro', () => {
  it('mantém cada acorde grudado na sílaba em que foi digitado', () => {
    const doc = parseChordPro('[G]Pai Nosso que est[C]ais no c[G]éu');
    expect(doc.lines).toHaveLength(1);
    expect(doc.lines[0]).toEqual({
      type: 'lyric',
      pairs: [
        { chord: 'G', lyrics: 'Pai Nosso que est' },
        { chord: 'C', lyrics: 'ais no c' },
        { chord: 'G', lyrics: 'éu' },
      ],
    });
  });

  it('aceita letra antes do primeiro acorde', () => {
    const doc = parseChordPro('Vem, ó [D]Santo Espírito');
    expect(doc.lines[0].pairs).toEqual([
      { chord: null, lyrics: 'Vem, ó ' },
      { chord: 'D', lyrics: 'Santo Espírito' },
    ]);
  });

  it('aceita linha só de acordes (introdução)', () => {
    const doc = parseChordPro('[G] [C] [D]');
    expect(doc.lines[0].pairs.map((p) => p.chord)).toEqual(['G', 'C', 'D']);
  });

  it('lê as diretivas de metadados', () => {
    const doc = parseChordPro('{title: Vem, Espírito Santo}\n{artist: Pe. Zezinho}\n{key: G}\n[G]Vem');
    expect(doc.meta).toMatchObject({
      title: 'Vem, Espírito Santo',
      artist: 'Pe. Zezinho',
      key: 'G',
    });
    expect(doc.lines).toHaveLength(1);
  });

  it('reconhece comentários e as formas abreviadas das diretivas', () => {
    const doc = parseChordPro('{c: Refrão}\n[C]Aleluia');
    expect(doc.lines[0]).toEqual({ type: 'comment', text: 'Refrão' });
  });

  it('agrupa refrãos delimitados por start_of_chorus', () => {
    const doc = parseChordPro(
      ['{soc}', '[C]Aleluia, [G]aleluia', '{eoc}', '[F]Cantai ao Senhor'].join('\n'),
    );
    expect(doc.lines.map((l) => l.type)).toEqual(['chorus-start', 'lyric', 'chorus-end', 'lyric']);
    expect(doc.lines[1].chorus).toBe(true);
    expect(doc.lines[3].chorus).toBeFalsy();
  });

  it('preserva linhas em branco como separadores de estrofe', () => {
    const doc = parseChordPro('[C]Um\n\n[G]Dois');
    expect(doc.lines.map((l) => l.type)).toEqual(['lyric', 'empty', 'lyric']);
  });

  it('não quebra com colchete não fechado', () => {
    const doc = parseChordPro('[G]Senhor [Cmisericórdia');
    expect(doc.lines[0].pairs).toEqual([
      { chord: 'G', lyrics: 'Senhor ' },
      { chord: null, lyrics: '[Cmisericórdia' },
    ]);
  });

  it('devolve documento vazio para entrada vazia ou nula', () => {
    expect(parseChordPro('').lines).toEqual([]);
    expect(parseChordPro(null).lines).toEqual([]);
  });
});

describe('extractPlainLyrics', () => {
  it('remove acordes e diretivas para permitir busca por trecho', () => {
    const text = '{title: Pai Nosso}\n{c: Refrão}\n[G]Pai Nosso que est[C]ais no c[G]éu';
    expect(extractPlainLyrics(text)).toBe('Pai Nosso que estais no céu');
  });

  it('junta várias linhas com espaço simples', () => {
    expect(extractPlainLyrics('[C]Santo, [G]Santo\n[F]Santo é o Senhor')).toBe(
      'Santo, Santo Santo é o Senhor',
    );
  });
});

describe('extractKey', () => {
  it('usa a diretiva key quando existe', () => {
    expect(extractKey('{key: Bb}\n[F]Vem')).toBe('Bb');
  });

  it('cai no primeiro acorde quando não há diretiva', () => {
    expect(extractKey('[Am]Vem [F]Senhor')).toBe('Am');
  });

  it('devolve null quando não há acorde algum', () => {
    expect(extractKey('só letra, sem cifra')).toBeNull();
  });
});

describe('groupIntoWords', () => {
  it('agrupa os pares em palavras, mantendo o acorde na sílaba', () => {
    const doc = parseChordPro('[G]Pai Nosso que est[C]ais no c[G]éu');
    const words = groupIntoWords(doc.lines[0].pairs);

    expect(words.map((word) => word.segments.map((s) => s.text).join(''))).toEqual([
      'Pai ',
      'Nosso ',
      'que ',
      'estais ',
      'no ',
      'céu',
    ]);

    // "estais" é uma só palavra, com o C exatamente sobre "ais".
    const estais = words[3];
    expect(estais.segments).toEqual([
      { chord: null, text: 'est' },
      { chord: 'C', text: 'ais ' },
    ]);

    // O G inicial fica na primeira sílaba de "Pai".
    expect(words[0].segments[0]).toEqual({ chord: 'G', text: 'Pai ' });
    // O G final fica sobre "éu", dentro da palavra "céu".
    expect(words[5].segments).toEqual([
      { chord: null, text: 'c' },
      { chord: 'G', text: 'éu' },
    ]);
  });

  it('mantém cada acorde de uma introdução como palavra própria', () => {
    const doc = parseChordPro('[G] [C] [D]');
    const words = groupIntoWords(doc.lines[0].pairs);
    expect(words).toHaveLength(3);
    expect(words.map((word) => word.segments[0].chord)).toEqual(['G', 'C', 'D']);
  });

  it('preserva letra sem acorde antes do primeiro colchete', () => {
    const doc = parseChordPro('Vem, ó [D]Santo Espírito');
    const words = groupIntoWords(doc.lines[0].pairs);
    expect(words.map((word) => word.segments.map((s) => s.text).join(''))).toEqual([
      'Vem, ',
      'ó ',
      'Santo ',
      'Espírito',
    ]);
    expect(words[2].segments[0].chord).toBe('D');
  });

  it('não perde espaços múltiplos usados para alinhar', () => {
    const doc = parseChordPro('[G]Um   [C]dois');
    const words = groupIntoWords(doc.lines[0].pairs);
    expect(words.map((word) => word.segments.map((s) => s.text).join('')).join('')).toBe(
      'Um   dois',
    );
  });

  it('devolve lista vazia para linha sem conteúdo', () => {
    expect(groupIntoWords([])).toEqual([]);
  });
});
