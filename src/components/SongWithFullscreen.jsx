'use client';

/**
 * Tela da música: a cifra e a tela cheia são duas visões da mesma música, então
 * dividem a transposição. Quem ajusta o tom em uma encontra o mesmo tom na outra.
 */
import { useState } from 'react';
import Link from 'next/link';
import { Icon } from './Icon.jsx';
import { PerformanceMode } from './PerformanceMode.jsx';
import { SongViewer } from './SongViewer.jsx';

/**
 * @param {{
 *   song: {id: string, title: string, composer?: string|null, originalKey: string, chordPro: string},
 *   meta?: import('react').ReactNode,
 *   children?: import('react').ReactNode,
 * }} props `children` são as demais ações, ao lado de Tela cheia; `meta` entra
 * logo abaixo do título, antes da cifra.
 */
export function SongWithFullscreen({ song, meta, children }) {
  const [offset, setOffset] = useState(0);

  return (
    <>
      <header className="ui-song-head">
        <Link
          className="ui-button ui-button--subtle ui-button--icon"
          href="/acervo"
          aria-label="Voltar ao acervo"
          title="Voltar ao acervo"
        >
          <Icon name="arrow-left" />
        </Link>
        <h1 className="ui-heading-medium">{song.title}</h1>
        <span className="ui-song-head__actions">
          <PerformanceMode iconOnly label="Tela cheia" songs={[song]} offset={offset} onOffsetChange={setOffset} />
          {children}
        </span>
      </header>

      {meta}

      <SongViewer song={song} variant="embedded" offset={offset} onOffsetChange={setOffset} />
    </>
  );
}
