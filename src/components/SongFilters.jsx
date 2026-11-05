'use client';

/**
 * Busca do Acervo: os resultados acompanham o que se digita e cada filtro, sem
 * botão de enviar. A URL guarda a busca, então voltar e compartilhar funcionam.
 * No celular, os filtros ficam recolhidos para a lista aparecer primeiro.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './Icon.jsx';
import { Select } from './Select.jsx';

const DEBOUNCE_MS = 300;

/**
 * @param {{
 *   q: string, moment: string, season: string, tag: string,
 *   momentOptions: {value: string, label: string}[],
 *   seasonOptions: {value: string, label: string}[],
 *   tagOptions: {value: string, label: string}[],
 * }} props `tagOptions` vazio esconde o filtro de tag.
 */
export function SongFilters({ q, moment, season, tag, momentOptions, seasonOptions, tagOptions }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const timer = useRef(null);
  const [text, setText] = useState(q);
  const [filters, setFilters] = useState({ moment, season, tag });
  const [open, setOpen] = useState(false);

  // A URL pode mudar por fora (Limpar filtros, voltar do navegador). Enquanto a
  // pessoa digita, o campo manda: uma resposta atrasada não pode apagar letras.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setText(q);
  }, [q]);

  useEffect(() => setFilters({ moment, season, tag }), [moment, season, tag]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const search = (nextText, nextFilters) => {
    clearTimeout(timer.current);
    const params = new URLSearchParams();
    if (nextText.trim()) params.set('q', nextText.trim());
    if (nextFilters.moment) params.set('momento', nextFilters.moment);
    if (nextFilters.season) params.set('tempo', nextFilters.season);
    if (nextFilters.tag) params.set('tag', nextFilters.tag);
    const query = params.toString();
    router.replace(query ? `/acervo?${query}` : '/acervo', { scroll: false });
  };

  const onText = (value) => {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(value, filters), DEBOUNCE_MS);
  };

  const onFilter = (field) => (value) => {
    const next = { ...filters, [field]: value };
    setFilters(next);
    search(text, next);
  };

  const active = [filters.moment, filters.season, filters.tag].filter(Boolean).length;

  return (
    <div className="ui-filters" role="search">
      <div className="ui-search">
        <Icon name="search" />
        <input
          ref={inputRef}
          type="search"
          value={text}
          aria-label="Buscar por título, trecho da letra ou tag"
          placeholder="Título, trecho da letra ou #tag"
          onChange={(event) => onText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            search(text, filters);
          }}
        />
      </div>

      <button
        type="button"
        className="ui-button ui-filters__toggle"
        aria-expanded={open}
        aria-label={active ? `Filtros, ${active} ativo${active > 1 ? 's' : ''}` : 'Filtros'}
        onClick={() => setOpen(!open)}
      >
        <Icon name="filter" />
        {active > 0 && <span className="ui-filters__count">{active}</span>}
      </button>

      <div className="ui-filters__more" data-open={open || undefined}>
        <Select label="Momento" value={filters.moment} options={momentOptions} onChange={onFilter('moment')} />
        <Select label="Tempo litúrgico" value={filters.season} options={seasonOptions} onChange={onFilter('season')} />
        {tagOptions.length > 1 && (
          <Select searchable label="Tag" value={filters.tag} options={tagOptions} onChange={onFilter('tag')} />
        )}
      </div>
    </div>
  );
}
