import { describe, it, expect } from 'vitest';
import {
  transposeChord,
  transposeChordPro,
  transposeKey,
  semitonesBetween,
  keyPrefersFlats,
} from '@/domain/chordpro/transpose.js';

describe('transposeChord', () => {
  it('sobe um semitom mantendo o sufixo', () => {
    expect(transposeChord('G', 1)).toBe('G#');
    expect(transposeChord('Am7', 1)).toBe('A#m7');
  });

  it('desce semitons preferindo bemóis quando o tom destino é bemol', () => {
    expect(transposeChord('G', -1, { preferFlats: true })).toBe('Gb');
    expect(transposeChord('C', -2, { preferFlats: true })).toBe('Bb');
  });

  it('transpõe também o baixo invertido', () => {
    expect(transposeChord('G/B', 2)).toBe('A/C#');
  });

  it('volta ao mesmo acorde ao girar uma oitava', () => {
    expect(transposeChord('F#m7(b5)', 12)).toBe('F#m7(b5)');
  });

  it('normaliza o giro além da oitava', () => {
    expect(transposeChord('C', 14)).toBe('D');
    expect(transposeChord('C', -13, { preferFlats: true })).toBe('B');
  });

  it('deixa passar texto que não é acorde', () => {
    expect(transposeChord('Refrão', 3)).toBe('Refrão');
  });
});

describe('semitonesBetween e transposeKey', () => {
  it('mede a distância entre dois tons pelo caminho mais curto', () => {
    expect(semitonesBetween('G', 'A')).toBe(2);
    expect(semitonesBetween('G', 'F')).toBe(-2);
    expect(semitonesBetween('C', 'C')).toBe(0);
  });

  it('transpõe o tom preservando o modo menor', () => {
    expect(transposeKey('Am', 2)).toBe('Bm');
    expect(transposeKey('G', -2)).toBe('F');
  });
});

describe('keyPrefersFlats', () => {
  it('usa bemóis nos tons da parte bemol do círculo das quintas', () => {
    expect(keyPrefersFlats('F')).toBe(true);
    expect(keyPrefersFlats('Bb')).toBe(true);
    expect(keyPrefersFlats('Dm')).toBe(true);
    expect(keyPrefersFlats('G')).toBe(false);
    expect(keyPrefersFlats('E')).toBe(false);
  });
});

describe('transposeChordPro', () => {
  it('transpõe apenas os acordes entre colchetes, preservando a letra', () => {
    const song = '[G]Pai Nosso que est[C]ais no c[G]éu';
    expect(transposeChordPro(song, 2)).toBe('[A]Pai Nosso que est[D]ais no c[A]éu');
  });

  it('preserva diretivas, comentários e quebras de linha', () => {
    const song = ['{title: Pai Nosso}', '{c: Refrão}', '', '[Am]Santificado [F]seja'].join('\n');
    const out = transposeChordPro(song, 1, { preferFlats: true });
    expect(out).toBe(['{title: Pai Nosso}', '{c: Refrão}', '', '[Bbm]Santificado [Gb]seja'].join('\n'));
  });

  it('escolhe a grafia a partir do tom destino quando ele é informado', () => {
    const song = '[C]Vem [G]Espírito';
    expect(transposeChordPro(song, -2, { targetKey: 'Bb' })).toBe('[Bb]Vem [F]Espírito');
  });

  it('não altera nada quando a transposição é zero', () => {
    const song = '[F#m]Eis-me aqui [B]Senhor';
    expect(transposeChordPro(song, 0)).toBe(song);
  });
});
