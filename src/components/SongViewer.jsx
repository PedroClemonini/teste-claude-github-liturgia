'use client';

/**
 * Tela do músico: cifra grande, transposição em um clique e modo somente letra
 * para quem canta sem instrumento.
 */
import { useEffect, useMemo, useState } from 'react';
import { ChordSheet } from './ChordSheet.jsx';
import { Icon } from './Icon.jsx';
import {
  keyPrefersFlats,
  semitonesBetween,
  transposeKey,
} from '@/domain/chordpro/transpose.js';

// Preferência de leitura, não da música: vale para toda cifra que o músico
// abrir, por isso fica salva no aparelho em vez de junto do offset de tom.
const FONT_SCALE_STORAGE_KEY = 'cifra-font-scale';
const FONT_SCALE_MIN = 0.85;
const FONT_SCALE_MAX = 1.6;
const FONT_SCALE_STEP = 0.15;

/**
 * @param {{
 *   song: {title: string, composer?: string|null, originalKey: string, chordPro: string},
 *   performanceKey?: string|null,
 *   momentLabel?: string|null,
 *   variant?: 'full' | 'embedded',
 *   offset?: number,
 *   onOffsetChange?: (offset: number) => void,
 * }} props
 */
export function SongViewer({
  song,
  performanceKey = null,
  momentLabel = null,
  // "embedded" é o uso dentro do roteiro, onde título e momento já aparecem
  // na linha que se abre — repeti-los só empurraria a cifra para baixo.
  variant = 'full',
  // Opcionais: quem precisa dividir a transposição com outra visão da mesma
  // música guarda o valor e o passa aqui.
  offset: sharedOffset,
  onOffsetChange,
}) {
  // Ponto de partida: o tom definido para a evento ou o tom original.
  const baseOffset = performanceKey ? semitonesBetween(song.originalKey, performanceKey) : 0;
  const [ownOffset, setOwnOffset] = useState(baseOffset);
  const offset = sharedOffset ?? ownOffset;
  const setOffset = onOffsetChange ?? setOwnOffset;
  const [showChords, setShowChords] = useState(true);
  const [fontScale, setFontScale] = useState(1);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(FONT_SCALE_STORAGE_KEY));
    if (saved >= FONT_SCALE_MIN && saved <= FONT_SCALE_MAX) {
      setFontScale(saved);
    }
  }, []);

  const changeFontScale = (delta) => {
    setFontScale((value) => {
      const next = Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Math.round((value + delta) * 100) / 100));
      window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(next));
      return next;
    });
  };

  const currentKey = useMemo(() => {
    // Ao descer o tom, a grafia com bemóis é a que os músicos leem melhor.
    const preferFlats = offset < 0 || keyPrefersFlats(transposeKey(song.originalKey, offset));
    return transposeKey(song.originalKey, offset, { preferFlats });
  }, [song.originalKey, offset]);

  const changed = offset !== baseOffset;
  // O painel já mostra o tom atual: o original só importa quando é outro.
  const meta = [song.composer, currentKey !== song.originalKey && `original: ${song.originalKey}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="viewer">
      <header className="viewer-head">
        <div>
          {variant === 'full' && (
            <>
              {momentLabel && <p className="viewer-moment">{momentLabel}</p>}
              <h1 className="viewer-title ui-heading-large">{song.title}</h1>
            </>
          )}
          {meta && <p className="viewer-meta">{meta}</p>}
        </div>
      </header>

      <div className="viewer-controls" role="group" aria-label="Controles da cifra">
        <button
          type="button"
          className="ui-button viewer-tool"
          onClick={() => setOffset(offset - 1)}
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
          className="ui-button viewer-tool"
          onClick={() => setOffset(offset + 1)}
          aria-label="Subir meio tom"
        >
          +
        </button>

        <button
          type="button"
          className="ui-button ui-button--subtle viewer-tool"
          onClick={() => setOffset(baseOffset)}
          disabled={!changed}
          aria-label={performanceKey ? 'Voltar ao tom da evento' : 'Voltar ao tom original'}
          title={performanceKey ? 'Voltar ao tom do evento' : 'Voltar ao tom original'}
        >
          <Icon name="retry" />
          <span className="viewer-tool__label">Voltar</span>
        </button>
        <button
          type="button"
          className="ui-button ui-button--subtle viewer-tool"
          aria-pressed={!showChords}
          onClick={() => setShowChords((value) => !value)}
          aria-label={showChords ? 'Somente letra' : 'Mostrar cifra'}
          title={showChords ? 'Somente letra' : 'Mostrar cifra'}
        >
          <Icon name="text" />
          <span className="viewer-tool__label">{showChords ? 'Somente letra' : 'Mostrar cifra'}</span>
        </button>

        <div className="viewer-font-controls" role="group" aria-label="Tamanho da letra">
          <button
            type="button"
            className="ui-button viewer-tool"
            onClick={() => changeFontScale(-FONT_SCALE_STEP)}
            disabled={fontScale <= FONT_SCALE_MIN}
            aria-label="Diminuir tamanho da letra"
          >
            A−
          </button>
          <button
            type="button"
            className="ui-button viewer-tool"
            onClick={() => changeFontScale(FONT_SCALE_STEP)}
            disabled={fontScale >= FONT_SCALE_MAX}
            aria-label="Aumentar tamanho da letra"
          >
            A+
          </button>
        </div>
      </div>

      <ChordSheet
        chordPro={song.chordPro}
        semitones={offset}
        targetKey={currentKey}
        showChords={showChords}
        fontScale={fontScale}
      />
    </article>
  );
}
