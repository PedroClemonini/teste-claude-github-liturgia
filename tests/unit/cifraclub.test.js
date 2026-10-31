import { describe, it, expect } from 'vitest';
import { extractTitle, extractTom, extractChordPro, extractCifraClubSong } from '@/domain/chordpro/cifraclub.js';

// Recorte simplificado da estrutura real de uma página do CifraClub: acordes
// em <b data-chord-name> posicionados pela coluna, acima da letra.
const SAMPLE_HTML = `
<html>
<head><title>Consagração À Nossa Senhora - Cifra Club</title></head>
<body>
<h1>Consagração À Nossa Senhora</h1>
<span>Tom<!-- -->: </span> <button type="button" data-anchor="--chord-tone">A</button>
<pre data-chord-content="true">
<div class="kvMV">[Intro] <b data-chord-name="A">A</b>  <b data-chord-name="A4">A4</b>
</div><div class="kvMV"><div class="tabs"><span class="tab">E|-9---9--10-10/12-10--9---5|</span></div>
[Primeira Parte]

</div><div class="kvMV"><b data-chord-name="A">A</b>
Oh, minha Senhora
</div><div class="kvMV">      <b data-chord-name="C#m">C#m</b>
E também minha Mãe

</div>
</pre>
</body>
</html>
`;

describe('extractTitle', () => {
  it('lê o título do <h1>', () => {
    expect(extractTitle(SAMPLE_HTML)).toBe('Consagração À Nossa Senhora');
  });

  it('devolve null quando não há <h1>', () => {
    expect(extractTitle('<html></html>')).toBeNull();
  });
});

describe('extractTom', () => {
  it('lê o tom do botão de cabeçalho da cifra', () => {
    expect(extractTom(SAMPLE_HTML)).toBe('A');
  });

  it('devolve null quando a página não tem o bloco de tom', () => {
    expect(extractTom('<html></html>')).toBeNull();
  });
});

describe('extractChordPro', () => {
  it('converte uma linha de acorde + letra em ChordPro, pela coluna do acorde', () => {
    const chordPro = extractChordPro(SAMPLE_HTML);
    expect(chordPro).toContain('[A]Oh, minha Senhora');
  });

  it('grava o acorde na sílaba certa quando ele não começa no início da linha', () => {
    const chordPro = extractChordPro(SAMPLE_HTML);
    // "C#m" cai na coluna 6 de "E também minha Mãe" → dentro de "também".
    expect(chordPro).toContain('E tamb[C#m]ém minha Mãe');
  });

  it('transforma um rótulo de seção em diretiva de comentário', () => {
    const chordPro = extractChordPro(SAMPLE_HTML);
    expect(chordPro).toContain('{c: Primeira Parte}');
  });

  it('ignora diagramas de tablatura', () => {
    const chordPro = extractChordPro(SAMPLE_HTML);
    expect(chordPro).not.toContain('E|-9');
  });

  it('mantém acordes sem letra (introduções/instrumentais) como acordes soltos', () => {
    const chordPro = extractChordPro(SAMPLE_HTML);
    expect(chordPro).toContain('{c: Intro}');
    expect(chordPro).toContain('[A] [A4]');
  });

  it('devolve string vazia quando a página não tem bloco de cifra', () => {
    expect(extractChordPro('<html></html>')).toBe('');
  });
});

describe('extractCifraClubSong', () => {
  it('combina título, tom e cifra num só objeto', () => {
    const song = extractCifraClubSong(SAMPLE_HTML);
    expect(song).toEqual({
      title: 'Consagração À Nossa Senhora',
      originalKey: 'A',
      chordPro: expect.stringContaining('[A]Oh, minha Senhora'),
    });
  });
});
