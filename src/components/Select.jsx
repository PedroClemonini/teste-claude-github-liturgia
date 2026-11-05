'use client';

/**
 * Select do Atlassian Design System. O <select> nativo não serve aqui porque
 * a lista aberta é desenhada pelo navegador ou pelo celular.
 *
 * Segue o padrão de combobox "somente seleção" da WAI-ARIA: o foco fica no
 * botão, e setas, Home, End, Enter, Espaço, Esc e digitar a inicial funcionam.
 * Com `searchable`, a lista ganha um campo de busca, que recebe o foco. O valor
 * vai num campo oculto, então o formulário funciona sem tratamento especial.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';

const TYPEAHEAD_RESET_MS = 500;

const normalize = (text) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/**
 * @param {{
 *   label: string,
 *   name?: string,
 *   options: {value: string, label: string, group?: string, keywords?: string, action?: boolean}[],
 *   defaultValue?: string,
 *   value?: string,
 *   onChange?: (value: string) => void,
 *   disabled?: boolean,
 *   compact?: boolean,
 *   searchable?: boolean,
 * }} props `compact` é para uso em tabelas: o rótulo some da tela (continua
 * para leitores). Com `value`, quem usa manda no valor: se a gravação falhar,
 * o menu não fica mostrando o errado. `group` agrupa opções vizinhas, e
 * `keywords` entra na busca sem aparecer na tela. `action` destaca uma opção que
 * faz algo em vez de escolher um valor, como acrescentar um item à lista.
 */
export function Select({
  label,
  name,
  options,
  defaultValue = '',
  value: valueProp,
  onChange,
  disabled,
  compact,
  searchable = false,
}) {
  const id = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const typed = useRef({ text: '', timer: null });
  const [ownValue, setOwnValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState('');

  const value = valueProp ?? ownValue;
  const selected = options.find((option) => option.value === value) ?? options[0];
  const visible = query
    ? options.filter((option) => normalize(`${option.label} ${option.keywords ?? ''}`).includes(normalize(query)))
    : options;

  const optionId = (index) => `${id}-option-${index}`;

  const openMenu = (index = Math.max(options.indexOf(selected), 0), seed = '') => {
    setQuery(seed);
    setActive(index);
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
    setQuery('');
    if (searchable) triggerRef.current?.focus();
  };

  const choose = (option) => {
    closeMenu();
    if (!option || option.value === value) return;
    setOwnValue(option.value);
    onChange?.(option.value);
  };

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (rootRef.current?.contains(event.target)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(typed.current.timer), []);

  /** Vai para a opção que começa com o que foi digitado. */
  const typeahead = (key) => {
    clearTimeout(typed.current.timer);
    typed.current.text += normalize(key);
    typed.current.timer = setTimeout(() => {
      typed.current.text = '';
    }, TYPEAHEAD_RESET_MS);

    const match = options.findIndex((option) => normalize(option.label).startsWith(typed.current.text));
    if (match >= 0) openMenu(match);
  };

  /** Teclas da lista aberta, comuns ao botão e ao campo de busca. */
  const onMenuKey = (event) => {
    const last = visible.length - 1;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActive((index) => Math.min(index + 1, last));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive((index) => Math.max(index - 1, 0));
        break;
      case 'Enter':
        event.preventDefault();
        if (visible[active]) choose(visible[active]);
        break;
      case 'Escape':
        event.preventDefault();
        // Dentro de um modal, o Esc fecha só o menu.
        event.stopPropagation();
        closeMenu();
        break;
      case 'Tab':
        setOpen(false);
        setQuery('');
        break;
      default:
    }
  };

  const onTriggerKey = (event) => {
    if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      if (searchable) openMenu(0, event.key);
      else typeahead(event.key);
      return;
    }

    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        openMenu();
      }
      return;
    }

    if (event.key === ' ') {
      event.preventDefault();
      choose(visible[active]);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActive(event.key === 'Home' ? 0 : visible.length - 1);
    } else {
      onMenuKey(event);
    }
  };

  return (
    <div className={compact ? 'ui-select--compact' : 'ui-field'}>
      <span id={`${id}-label`} className={compact ? 'ui-visually-hidden' : undefined}>
        {label}
      </span>
      <div className="ui-select" ref={rootRef}>
        {name && <input type="hidden" name={name} value={value} />}
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          className="ui-select__trigger"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-menu`}
          aria-labelledby={`${id}-label ${id}-value`}
          aria-activedescendant={open && !searchable ? optionId(active) : undefined}
          onClick={() => (open ? closeMenu() : openMenu())}
          onKeyDown={onTriggerKey}
        >
          <span className="ui-select__value" id={`${id}-value`}>
            {selected?.label}
          </span>
          <Icon name="chevron-down" />
        </button>

        {open && (
          <div className="ui-select__panel">
            {searchable && (
              <div className="ui-select__search">
                <Icon name="search" />
                <input
                  ref={searchRef}
                  value={query}
                  aria-label={`Buscar em ${label}`}
                  aria-controls={`${id}-menu`}
                  aria-activedescendant={visible[active] ? optionId(active) : undefined}
                  placeholder="Buscar"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActive(0);
                  }}
                  onKeyDown={onMenuKey}
                />
              </div>
            )}
            <ul className="ui-select__menu" id={`${id}-menu`} role="listbox" aria-labelledby={`${id}-label`}>
              {visible.length === 0 && <li className="ui-select__none">Nada encontrado</li>}
              {visible.flatMap((option, index) => {
                const isSelected = option === selected;
                const row = (
                  // O teclado é tratado no botão ou na busca, que mantêm o foco.
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                  <li
                    key={option.value}
                    id={optionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    className={[
                      'ui-select__option',
                      index === active ? 'ui-select__option--active' : '',
                      option.action ? 'ui-select__option--action' : '',
                    ].join(' ')}
                    onPointerMove={() => setActive(index)}
                    // Sem isso o botão perderia o foco ao tocar na lista.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(option)}
                  >
                    {option.label}
                    {isSelected && <Icon name="check-mark" />}
                  </li>
                );
                if (!option.group || option.group === visible[index - 1]?.group) return [row];
                return [
                  <li key={`grupo-${option.group}`} className="ui-select__group" role="presentation">
                    {option.group}
                  </li>,
                  row,
                ];
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
