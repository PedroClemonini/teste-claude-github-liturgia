'use client';

/** Campo de tags: Enter ou vírgula acrescenta, e as já usadas aparecem como sugestão. */
import { useId, useState } from 'react';
import { formatTag, normalizeTags } from '@/domain/songs/tags.js';
import { Icon } from './Icon.jsx';

/** @param {{value: string[], onChange: (tags: string[]) => void, suggestions?: string[], error?: string}} props */
export function TagInput({ value, onChange, suggestions = [], error }) {
  const id = useId();
  const [draft, setDraft] = useState('');

  const add = () => {
    onChange(normalizeTags([...value, ...draft.split(',')]));
    setDraft('');
  };

  return (
    <div>
      {value.length > 0 && (
        <ul className="ui-tag-list">
          {value.map((tag) => (
            <li key={tag} className="ui-tag">
              {formatTag(tag)}
              <button
                type="button"
                className="ui-tag__remove"
                aria-label={`Remover ${formatTag(tag)}`}
                onClick={() => onChange(value.filter((item) => item !== tag))}
              >
                <Icon name="cross" size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="ui-input-row ui-tag-input">
        <input
          value={draft}
          list={`${id}-tags`}
          aria-label="Nova tag"
          placeholder="#novenasaofrancisco"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => draft.trim() && add()}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ',') return;
            event.preventDefault();
            add();
          }}
        />
        <button type="button" className="ui-button" disabled={!draft.trim()} onClick={add}>
          Adicionar
        </button>
      </div>
      <datalist id={`${id}-tags`}>
        {suggestions
          .filter((tag) => !value.includes(tag))
          .map((tag) => (
            <option key={tag} value={tag} />
          ))}
      </datalist>
      {error && <p className="ui-error">{error}</p>}
    </div>
  );
}
