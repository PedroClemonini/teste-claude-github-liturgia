'use client';

/**
 * Menu de ações: lista suspensa no computador e painel inferior no celular
 * (quem decide é o CSS). Segue o padrão de menu da WAI-ARIA: setas, Home, End e
 * Esc funcionam, e o foco volta ao botão ao fechar.
 */
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from './Icon.jsx';

/**
 * @param {{
 *   label: string,
 *   items: {label: string, icon?: string, href?: string, onSelect?: () => void, danger?: boolean}[],
 *   triggerClassName?: string,
 *   children: import('react').ReactNode,
 * }} props `children` é o conteúdo do botão; `label`, o nome dele e do menu.
 * Item com `danger` fica em vermelho, separado dos demais.
 */
export function ActionMenu({ label, items, triggerClassName = 'ui-button', children }) {
  const id = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);

  const menuItems = () => [...(panelRef.current?.querySelectorAll('[role="menuitem"]') ?? [])];

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    menuItems()[0]?.focus();

    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  const onKeyDown = (event) => {
    const list = menuItems();
    const index = list.indexOf(document.activeElement);
    const target = {
      ArrowDown: list[(index + 1) % list.length],
      ArrowUp: list[(index - 1 + list.length) % list.length],
      Home: list[0],
      End: list.at(-1),
    }[event.key];

    if (target) {
      event.preventDefault();
      target.focus();
    } else if (event.key === 'Escape') {
      // Dentro de um modal, o Esc fecha só o menu.
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div className="ui-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        {children}
      </button>

      {open && (
        <>
          <div className="ui-menu__backdrop" aria-hidden="true" onClick={close} />
          <div ref={panelRef} id={id} className="ui-menu__panel" role="menu" aria-label={label} onKeyDown={onKeyDown}>
            <p className="ui-menu__title">{label}</p>
            {items.map((item) => {
              const className = `ui-menu__item ${item.danger ? 'ui-menu__item--danger' : ''}`;
              const content = (
                <>
                  {item.icon && <Icon name={item.icon} />}
                  {item.label}
                </>
              );
              return item.href ? (
                <Link key={item.label} role="menuitem" tabIndex={-1} className={className} href={item.href}>
                  {content}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className={className}
                  onClick={() => {
                    close();
                    item.onSelect();
                  }}
                >
                  {content}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
