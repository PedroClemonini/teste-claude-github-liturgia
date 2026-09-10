'use client';

/**
 * Tela dividida de cadastro: à esquerda o texto ChordPro, à direita a cifra
 * renderizada em tempo real — o coordenador confere o alinhamento enquanto
 * digita. No celular as duas metades empilham.
 */
import { useMemo } from 'react';
import { ChordSheet } from './ChordSheet.jsx';
import { extractKey, parseChordPro } from '@/domain/chordpro/parse.js';

const PLACEHOLDER = `{title: Pai Nosso}
{c: Refrão}
[G]Pai Nosso que est[C]ais no c[G]éu`;

/** @param {{value: string, onChange: (value: string) => void}} props */
export function ChordProEditor({ value, onChange }) {
  const chordCount = useMemo(() => {
    const doc = parseChordPro(value);
    return doc.lines
      .filter((line) => line.type === 'lyric')
      .reduce((total, line) => total + line.pairs.filter((pair) => pair.chord).length, 0);
  }, [value]);

  const detectedKey = useMemo(() => extractKey(value), [value]);

  return (
    <div className="editor">
      <div className="editor-pane">
        <label className="editor-label" htmlFor="chordpro">
          Cifra em ChordPro
        </label>
        <p className="editor-hint">
          Digite o acorde entre colchetes, encostado na sílaba em que ele muda:{' '}
          <code>[G]Pai Nosso que est[C]ais no c[G]éu</code>
        </p>
        <textarea
          id="chordpro"
          name="chordPro"
          className="editor-textarea"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={PLACEHOLDER}
          spellCheck={false}
          rows={18}
        />
        <div className="editor-status">
          <span data-testid="detected-key">Tom detectado: {detectedKey ?? '—'}</span>
          <span data-testid="chord-count">{chordCount} acordes</span>
        </div>
      </div>

      <div className="editor-pane">
        <p className="editor-label">Pré-visualização</p>
        <p className="editor-hint">É exatamente assim que o músico vai ler na celebração.</p>
        <div className="editor-preview" data-testid="preview">
          <ChordSheet chordPro={value} />
        </div>
      </div>
    </div>
  );
}
