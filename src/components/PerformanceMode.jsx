'use client';

/**
 * Modo missa: a cifra ocupa a tela inteira e o roteiro avança canto a canto na
 * ordem do rito. A tela fica acesa enquanto o modo está ligado — no meio da
 * celebração ninguém quer desbloquear o aparelho para ver a próxima estrofe.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { SongViewer } from './SongViewer.jsx';
import { Icon } from './Icon.jsx';

// Preferência de leitura, não do roteiro: vale para toda cifra aberta no modo
// missa, por isso fica salva no aparelho.
const COLUMNS_STORAGE_KEY = 'cifra-colunas';

/**
 * @param {{
 *   songs: Array<{
 *     id: string,
 *     title: string,
 *     composer?: string|null,
 *     originalKey: string,
 *     chordPro: string,
 *     momentLabel?: string|null,
 *     performanceKey?: string|null,
 *   }>,
 *   label?: string,
 *   iconOnly?: boolean,
 *   offset?: number,
 *   onOffsetChange?: (offset: number) => void,
 * }} props
 */
export function PerformanceMode({ songs, label = 'Modo missa', iconOnly = false, offset, onOffsetChange }) {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [columns, setColumns] = useState(1);
  const overlayRef = useRef(null);
  const bodyRef = useRef(null);

  const total = songs.length;
  const current = songs[index];

  const open = () => {
    setIndex(0);
    setActive(true);
    // Tela cheia de verdade é um bônus: onde o navegador recusa (iPhone não
    // implementa a API), a sobreposição sozinha já entrega a tela limpa.
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const close = useCallback(() => {
    setActive(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, []);

  const go = useCallback(
    (delta) => setIndex((value) => Math.min(total - 1, Math.max(0, value + delta))),
    [total],
  );

  useEffect(() => {
    if (window.localStorage.getItem(COLUMNS_STORAGE_KEY) === '2') setColumns(2);
  }, []);

  const toggleColumns = () =>
    setColumns((value) => {
      const next = value === 2 ? 1 : 2;
      window.localStorage.setItem(COLUMNS_STORAGE_KEY, String(next));
      return next;
    });

  useEffect(() => {
    if (!active) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    };
    // Sair pelo gesto do navegador fecha a sobreposição junto.
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setActive(false);
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    overlayRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.body.style.overflow = overflowAnterior;
    };
  }, [active, close, go]);

  useEffect(() => {
    if (!active || !navigator.wakeLock) return undefined;

    let sentinela = null;
    let encerrado = false;

    const segurar = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (encerrado) lock.release().catch(() => {});
        else sentinela = lock;
      } catch {
        // Bateria baixa ou aba em segundo plano: segue sem travar a tela.
      }
    };
    // O sistema solta a trava sozinho quando a aba sai de foco; ao voltar,
    // pede de novo — senão a tela apaga no meio do canto seguinte.
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') segurar();
    };

    segurar();
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      encerrado = true;
      document.removeEventListener('visibilitychange', aoVoltar);
      sentinela?.release().catch(() => {});
    };
  }, [active]);

  // Cada canto começa do topo, não de onde o anterior parou.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [index]);

  if (total === 0) return null;

  return (
    <>
      <button
        type="button"
        className={iconOnly ? 'ui-button ui-button--subtle ui-button--icon' : 'ui-button'}
        aria-label={label}
        title={label}
        onClick={open}
      >
        <Icon name="fullscreen-enter" />
        {!iconOnly && label}
      </button>

      {active && (
        <section
          className={`performance ${columns === 2 ? 'performance--colunas' : ''}`}
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label="Cifra em tela cheia"
          tabIndex={-1}
        >
          <header className="performance-bar">
            <div className="grow">
              {current.momentLabel && <p className="performance-moment">{current.momentLabel}</p>}
              <h2 className="performance-title">{current.title}</h2>
            </div>
            {/* Só aparece onde cabe: abaixo de 700px o CSS esconde o botão e
                ignora as colunas, senão a cifra fica ilegível no celular em pé. */}
            <button
              type="button"
              className="ui-button performance-columns"
              onClick={toggleColumns}
            >
              {columns === 2 ? '1 coluna' : '2 colunas'}
            </button>
            <button type="button" className="ui-button" onClick={close}>
              Sair
            </button>
          </header>

          <div className="performance-body" ref={bodyRef}>
            {/* Remontar a cada canto devolve a transposição ao tom da evento. */}
            <SongViewer
              key={current.id}
              song={current}
              performanceKey={current.performanceKey ?? null}
              variant="embedded"
              offset={offset}
              onOffsetChange={onOffsetChange}
            />
          </div>

          {total > 1 && (
            <nav className="performance-nav" aria-label="Cantos do roteiro">
              <button
                type="button"
                className="ui-button"
                onClick={() => go(-1)}
                disabled={index === 0}
              >
                ← Anterior
              </button>
              <span className="performance-count">
                {index + 1} / {total}
              </span>
              <button
                type="button"
                className="ui-button"
                onClick={() => go(1)}
                disabled={index === total - 1}
              >
                Próximo →
              </button>
            </nav>
          )}
        </section>
      )}
    </>
  );
}
