import { describe, it, expect } from 'vitest';
import {
  parseChordPro,
  extractPlainLyrics,
  extractKey,
  groupIntoWords,
  floatingChords,
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

describe('cifras importadas', () => {
  it('ignora espaços de largura zero no início da linha', () => {
    const doc = parseChordPro('\u200B[E]Maria');
    expect(doc.lines[0].pairs[0]).toEqual({ chord: 'E', lyrics: 'Maria' });
  });

  it('[Primeira Parte] sozinho na linha é título de seção', () => {
    expect(parseChordPro('\u200B[Primeira Parte]').lines[0]).toEqual({ type: 'comment', text: 'Primeira Parte' });
  });

  it('acorde sozinho na linha continua sendo acorde', () => {
    expect(parseChordPro('[Am]').lines[0].type).toBe('lyric');
  });
});

describe('floatingChords', () => {
  const flutuam = (linha, render) => {
    const words = groupIntoWords(parseChordPro(linha).lines[0].pairs);
    const chaves = floatingChords(words, render);
    return words.flatMap((word, w) =>
      word.segments.flatMap((segment, s) => (segment.chord ? [[segment.chord, chaves.has(`${w}:${s}`)]] : [])),
    );
  };

  it('acorde sobre espaço ou sílaba curta não alarga a letra', () => {
    expect(flutuam('foi a[B] escolhida')).toEqual([['B', true]]);
    expect(flutuam('com te[F#]u povo')).toEqual([['F#', true]]);
  });

  it('reserva espaço quando encostaria no acorde seguinte', () => {
    expect(flutuam('[C#m7]a[F#]mor')).toEqual([['C#m7', false], ['F#', true]]);
  });

  it('com sílabas longas, os dois flutuam', () => {
    expect(flutuam('[G]Santo Senhor [D]Deus')).toEqual([['G', true], ['D', true]]);
  });

  it('acorde sem letra embaixo mantém a própria largura', () => {
    expect(flutuam('[E] [A] [C#m]')).toEqual([['E', false], ['A', false], ['C#m', false]]);
  });

  it('conta o acorde como aparece na tela, depois de transpor', () => {
    expect(flutuam('[E7]se[F]nhor')).toEqual([['E7', false], ['F', true]]);
    expect(flutuam('[E]sen[F]hor', () => 'Ebm7')).toEqual([['E', false], ['F', true]]);
  });
});
