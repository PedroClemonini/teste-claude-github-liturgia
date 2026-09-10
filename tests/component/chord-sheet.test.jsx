// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ChordSheet } from '@/components/ChordSheet.jsx';

afterEach(cleanup);

describe('ChordSheet', () => {
  it('mantém cada acorde no mesmo bloco da sílaba que ele acompanha', () => {
    render(<ChordSheet chordPro="[G]Pai Nosso que est[C]ais no c[G]éu" />);

    const pairs = document.querySelectorAll('[data-testid="pair"]');
    const comAcorde = [...pairs].filter((pair) => pair.querySelector('[data-testid="chord"]'));
    expect(comAcorde).toHaveLength(3);

    expect(comAcorde[0].querySelector('[data-testid="chord"]').textContent).toBe('G');
    expect(comAcorde[0].querySelector('[data-testid="lyric"]').textContent).toBe('Pai ');

    // O C soa em "ais", dentro da palavra "estais".
    expect(comAcorde[1].querySelector('[data-testid="chord"]').textContent).toBe('C');
    expect(comAcorde[1].querySelector('[data-testid="lyric"]').textContent).toBe('ais ');
  });

  it('quebra a linha só entre palavras, nunca no meio de uma palavra cifrada', () => {
    render(<ChordSheet chordPro="[G]nós vos bendi[A7]zemos" />);

    const words = [...document.querySelectorAll('[data-testid="word"]')];
    // "bendizemos" é uma palavra só, com o A7 dentro dela.
    const bendizemos = words.at(-1);
    expect(bendizemos.querySelector('[data-testid="chord"]').textContent).toBe('A7');
    expect([...bendizemos.querySelectorAll('[data-testid="lyric"]')].map((el) => el.textContent).join('')).toBe('bendizemos');
    expect(words).toHaveLength(3);
  });

  it('transpõe a cifra pela quantidade de semitons recebida', () => {
    render(<ChordSheet chordPro="[G]Pai Nosso que est[C]ais no c[G]éu" semitones={2} />);
    const chords = [...document.querySelectorAll('[data-testid="chord"]')].map((el) => el.textContent);
    expect(chords).toEqual(['A', 'D', 'A']);
  });

  it('usa a grafia do tom destino ao transpor', () => {
    render(<ChordSheet chordPro="[C]Vem [G]Espírito" semitones={-2} targetKey="Bb" />);
    const chords = [...document.querySelectorAll('[data-testid="chord"]')].map((el) => el.textContent);
    expect(chords).toEqual(['Bb', 'F']);
  });

  it('esconde os acordes no modo somente letra', () => {
    render(<ChordSheet chordPro="[G]Pai Nosso" showChords={false} />);
    expect(document.querySelectorAll('[data-testid="chord"]')).toHaveLength(0);
    // A letra continua legível e completa, palavra por palavra.
    expect(document.querySelector('.sheet-line').textContent).toBe('Pai Nosso');
  });

  it('destaca o refrão e mostra os comentários', () => {
    render(<ChordSheet chordPro={'{c: Refrão}\n{soc}\n[C]Aleluia\n{eoc}'} />);
    expect(screen.getByText('Refrão')).toBeTruthy();
    expect(document.querySelectorAll('[data-chorus="true"]')).toHaveLength(1);
  });

  it('mostra um aviso quando não há cifra alguma', () => {
    render(<ChordSheet chordPro="" />);
    expect(screen.getByText(/nada para mostrar/i)).toBeTruthy();
  });
});
