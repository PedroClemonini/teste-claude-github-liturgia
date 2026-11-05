'use client';

/**
 * Tela da música: a cifra e a tela cheia são duas visões da mesma música, então
 * dividem a transposição. Quem ajusta o tom em uma encontra o mesmo tom na outra.
 */
import { useState } from 'react';
import { PerformanceMode } from './PerformanceMode.jsx';
import { SongViewer } from './SongViewer.jsx';

/**
 * @param {{
 *   song: {id: string, title: string, composer?: string|null, originalKey: string, chordPro: string},
 *   breadcrumbs: import('react').ReactNode,
 *   children?: import('react').ReactNode,
 * }} props `children` são as demais ações, ao lado de Tela cheia.
 */
export function SongWithFullscreen({ song, breadcrumbs, children }) {
  const [offset, setOffset] = useState(0);

  return (
    <>
      <div className="ui-page-head">
        {breadcrumbs}
        <span className="ui-button-group">
          <PerformanceMode label="Tela cheia" songs={[song]} offset={offset} onOffsetChange={setOffset} />
          {children}
        </span>
      </div>

      <div className="ui-card">
        <SongViewer song={song} offset={offset} onOffsetChange={setOffset} />
      </div>
    </>
  );
}
