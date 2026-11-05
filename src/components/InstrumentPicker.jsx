'use client';

/**
 * Vozes e instrumentos da pessoa: sugestões para marcar e um campo para
 * acrescentar qualquer outro.
 */
import { useState } from 'react';
import { INSTRUMENT_SUGGESTIONS } from '@/domain/team/instruments.js';

/**
 * @param {{value: string[], onChange: (items: string[]) => void, error?: string, hideLegend?: boolean}} props
 * `hideLegend` é para quando a seção em volta já tem esse título.
 */
export function InstrumentPicker({ value, onChange, error, hideLegend = false }) {
  const [draft, setDraft] = useState('');

  const has = (item) => value.some((current) => current.toLowerCase() === item.toLowerCase());
  const remove = (item) => onChange(value.filter((current) => current.toLowerCase() !== item.toLowerCase()));

  const add = () => {
    const item = draft.trim();
    if (item && !has(item)) onChange([...value, item]);
    setDraft('');
  };

  const outros = value.filter(
    (item) => !INSTRUMENT_SUGGESTIONS.some((suggestion) => suggestion.toLowerCase() === item.toLowerCase()),
  );

  return (
    <fieldset className="ui-fieldset">
      <legend className={hideLegend ? 'ui-visually-hidden' : undefined}>Vozes e instrumentos</legend>
      <div className="ui-checkbox-grid">
        {[...INSTRUMENT_SUGGESTIONS, ...outros].map((item) => (
          <label key={item} className="ui-checkbox">
            <input
              type="checkbox"
              checked={has(item)}
              onChange={() => (has(item) ? remove(item) : onChange([...value, item]))}
            />
            {item}
          </label>
        ))}
      </div>
      <div className="ui-form ui-input-row ui-instrument-add">
        <input
          value={draft}
          aria-label="Outro instrumento"
          placeholder="Outro instrumento"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            add();
          }}
        />
        <button type="button" className="ui-button" disabled={!draft.trim()} onClick={add}>
          Adicionar
        </button>
      </div>
      {error && <p className="ui-error">{error}</p>}
    </fieldset>
  );
}
