'use client';

/**
 * Tela do músico: cifra grande, transposição em um clique e modo somente letra
 * para quem canta sem instrumento.
 */
import { useMemo, useState } from 'react';
import { ChordSheet } from './ChordSheet.jsx';
import {
  keyPrefersFlats,
  semitonesBetween,
  transposeKey,
} from '@/domain/chordpro/transpose.js';

/**
 * @param {{
 *   song: {title: string, composer?: string|null, originalKey: string, chordPro: string},
 *   performanceKey?: string|null,
 *   momentLabel?: string|null,
 *   variant?: 'full' | 'embedded',
 * }} props
 */
export function SongViewer({
  song,
  performanceKey = null,
  momentLabel = null,
  // "embedded" é o uso dentro do roteiro, onde título e momento já aparecem
  // na linha que se abre — repeti-los só empurraria a cifra para baixo.
  variant = 'full',
}) {
  // Ponto de partida: o tom definido para a celebração ou o tom original.
  const baseOffset = performanceKey ? semitonesBetween(song.originalKey, performanceKey) : 0;
  const [offset, setOffset] = useState(baseOffset);
  const [showChords, setShowChords] = useState(true);

  const currentKey = useMemo(() => {
    // Ao descer o tom, a grafia com bemóis é a que os músicos leem melhor.
    const preferFlats = offset < 0 || keyPrefersFlats(transposeKey(song.originalKey, offset));
    return transposeKey(song.originalKey, offset, { preferFlats });
  }, [song.originalKey, offset]);

  const changed = offset !== baseOffset;

  return (
    <article className="viewer">
      <header className="viewer-head">
        <div>
          {variant === 'full' && (
            <>
              {momentLabel && <p className="viewer-moment">{momentLabel}</p>}
              <h1 className="viewer-title">{song.title}</h1>
            </>
          )}
          <p className="viewer-meta">
            {song.composer ? `${song.composer} · ` : ''}
            <span>tom original: {song.originalKey}</span>
          </p>
        </div>
      </header>

      <div className="viewer-controls" role="group" aria-label="Transposição">
        <button
          type="button"
          className="btn btn--round"
          onClick={() => setOffset((value) => value - 1)}
          aria-label="Descer meio tom"
        >
          −
        </button>
        <div className="viewer-key">
          <span className="viewer-key-label">tom</span>
          <strong data-testid="current-key">{currentKey}</strong>
        </div>
        <button
          type="button"
          className="btn btn--round"
          onClick={() => setOffset((value) => value + 1)}
          aria-label="Subir meio tom"
        >
          +
        </button>

        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setOffset(baseOffset)}
          disabled={!changed}
          aria-label={performanceKey ? 'Voltar ao tom da celebração' : 'Voltar ao tom original'}
        >
          Voltar
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setShowChords((value) => !value)}
          aria-label={showChords ? 'Somente letra' : 'Mostrar cifra'}
        >
          {showChords ? 'Somente letra' : 'Mostrar cifra'}
        </button>
      </div>

      <ChordSheet
        chordPro={song.chordPro}
        semitones={offset}
        targetKey={currentKey}
        showChords={showChords}
      />
    </article>
  );
}
