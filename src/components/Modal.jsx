'use client';

/**
 * Modal do Atlassian Design System. Fecha com Esc ou clicando fora, mantém o
 * Tab dentro da janela e devolve o foco a quem a abriu.
 */
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon.jsx';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex="0"]';

/**
 * @param {{
 *   title: string,
 *   onClose: () => void,
 *   role?: 'dialog' | 'alertdialog',
 *   hideClose?: boolean,
 *   children: import('react').ReactNode,
 * }} props
 */
export function Modal({ title, onClose, role = 'dialog', hideClose = false, children }) {
  const titleId = useId();
  const ref = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    ref.current?.focus();
    return () => opener?.focus?.();
  }, []);

  // Na janela, não no modal: se o botão com foco some (ex.: Revogar), o foco
  // cai na página e o modal deixaria de ouvir o Esc. Um menu aberto trata o
  // próprio Esc antes e marca o evento, então só ele fecha.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onEscape = (event) => {
      if (event.key === 'Escape' && !event.defaultPrevented) closeRef.current();
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);

  const onKeyDown = (event) => {
    if (event.key !== 'Tab') return;

    const items = [...ref.current.querySelectorAll(FOCUSABLE)];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const current = document.activeElement;

    if (event.shiftKey && (current === first || current === ref.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  };

  // No body: dentro da página, herdaria os estilos de onde foi aberto. Um botão
  // de confirmar espremido assim já chegou a cobrir o Cancelar.
  return createPortal(
    <div
      className="ui-blanket"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className="ui-modal ui-modal--wide"
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <div className="ui-modal__head">
          <h2 className="ui-heading-medium" id={titleId}>
            {title}
          </h2>
          {!hideClose && (
            <button
              type="button"
              className="ui-button ui-button--subtle ui-button--icon"
              aria-label="Fechar"
              onClick={onClose}
            >
              <Icon name="cross" />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
