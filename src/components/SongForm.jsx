'use client';

/**
 * Cadastro de música com tela dividida: à esquerda o texto ChordPro, à direita
 * a cifra renderizada em tempo real.
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChordProEditor } from './ChordProEditor.jsx';
import { TagInput } from './TagInput.jsx';
import { LITURGICAL_MOMENTS } from '@/domain/liturgy/moments.js';
import { LITURGICAL_SEASONS } from '@/domain/liturgy/seasons.js';
import { extractKey } from '@/domain/chordpro/parse.js';

/** @param {{song?: object, tagSuggestions?: string[]}} props */
export function SongForm({ song = null, tagSuggestions = [] }) {
  const router = useRouter();
  const editando = Boolean(song);

  const [form, setForm] = useState({
    title: song?.title ?? '',
    composer: song?.composer ?? '',
    chordPro: song?.chordPro ?? '',
    originalKey: song?.originalKey ?? '',
    audioUrl: song?.audioUrl ?? '',
    moments: song?.moments ?? [],
    seasons: song?.seasons ?? [],
    tags: song?.tags ?? [],
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const importFromCifraClub = async (event) => {
    event.preventDefault();
    setImporting(true);
    setImportError(null);

    const response = await fetch('/api/songs/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: importUrl }),
    });
    const body = await response.json().catch(() => ({}));
    setImporting(false);

    if (!response.ok) {
      setImportError(body.error ?? 'Não foi possível importar essa cifra.');
      return;
    }

    setForm((current) => ({
      ...current,
      title: body.song.title || current.title,
      originalKey: body.song.originalKey || current.originalKey,
      chordPro: body.song.chordPro,
    }));
  };

  const toggle = (field, value) =>
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));

  const detectado = extractKey(form.chordPro);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);

    const response = await fetch(editando ? `/api/songs/${song.id}` : '/api/songs', {
      method: editando ? 'PUT' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...form,
        composer: form.composer || null,
        // Em branco, o servidor deduz o tom a partir do primeiro acorde.
        originalKey: form.originalKey || undefined,
        audioUrl: form.audioUrl || null,
      }),
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setErrors(body.details ?? {});
      setMessage(body.error ?? 'Não foi possível salvar a música.');
      return;
    }

    router.push(`/acervo/${body.song.id}`);
    router.refresh();
  };

  return (
    <form className="ui-form" onSubmit={submit} noValidate>
      {!editando && (
        <section className="ui-card ui-form__section">
          <h2 className="ui-heading-small">Importar do CifraClub</h2>
          <p className="ui-helper">
            Opcional. Preenche título, tom e cifra a partir da página; revise antes de salvar.
          </p>
          <div className="ui-input-row">
            <input
              type="url"
              aria-label="Endereço da cifra no CifraClub"
              value={importUrl}
              onChange={(event) => setImportUrl(event.target.value)}
              placeholder="https://www.cifraclub.com.br/..."
            />
            <button
              className="ui-button"
              type="button"
              onClick={importFromCifraClub}
              disabled={importing || !importUrl}
            >
              {importing ? 'Importando…' : 'Importar'}
            </button>
          </div>
          {importError && <p className="ui-error">{importError}</p>}
        </section>
      )}

      <section className="ui-card ui-form__section">
        <h2 className="ui-heading-small">Informações</h2>
        <div className="grid-2">
          <label className="ui-field">
            <span>
              Título <em aria-hidden="true">*</em>
            </span>
            <input required value={form.title} onChange={update('title')} aria-invalid={Boolean(errors.title)} />
            {errors.title && <p className="ui-error">{errors.title}</p>}
          </label>

          <label className="ui-field">
            <span>Autor ou fonte</span>
            <input value={form.composer} onChange={update('composer')} placeholder="Pe. Zezinho, CD da Campanha…" />
          </label>

          <label className="ui-field">
            <span>Tom original</span>
            <input
              value={form.originalKey}
              onChange={update('originalKey')}
              aria-invalid={Boolean(errors.originalKey)}
              placeholder={detectado ? `${detectado} (detectado)` : 'G'}
            />
            {errors.originalKey && <p className="ui-error">{errors.originalKey}</p>}
          </label>

          <label className="ui-field">
            <span>Link para ouvir</span>
            <input
              type="url"
              value={form.audioUrl}
              onChange={update('audioUrl')}
              aria-invalid={Boolean(errors.audioUrl)}
              placeholder="https://youtube.com/..."
            />
            {errors.audioUrl && <p className="ui-error">{errors.audioUrl}</p>}
          </label>
        </div>
      </section>

      <section className="ui-card ui-form__section">
        <h2 className="ui-heading-small">Adequação litúrgica</h2>
        <fieldset className="ui-fieldset">
          <legend>Momentos do rito em que serve</legend>
          <div className="ui-checkbox-grid">
            {LITURGICAL_MOMENTS.map((moment) => (
              <label key={moment.id} className="ui-checkbox">
                <input
                  type="checkbox"
                  checked={form.moments.includes(moment.id)}
                  onChange={() => toggle('moments', moment.id)}
                />
                {moment.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="ui-fieldset">
          <legend>Tempos litúrgicos</legend>
          <p className="ui-helper">
            Sem nenhum marcado, a música só aparece quando o filtro de tempo do Acervo está em Todos.
          </p>
          <div className="ui-checkbox-grid">
            {LITURGICAL_SEASONS.map((season) => (
              <label key={season.id} className="ui-checkbox">
                <input
                  type="checkbox"
                  checked={form.seasons.includes(season.id)}
                  onChange={() => toggle('seasons', season.id)}
                />
                {season.label}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="ui-card ui-form__section">
        <h2 className="ui-heading-small">Tags</h2>
        <p className="ui-helper">
          Facilitam a busca, como #novenasaofrancisco. Aperte Enter para acrescentar cada uma.
        </p>
        <TagInput
          value={form.tags}
          suggestions={tagSuggestions}
          onChange={(tags) => setForm((current) => ({ ...current, tags }))}
          error={errors.tags}
        />
      </section>

      <ChordProEditor
        value={form.chordPro}
        onChange={(value) => setForm((current) => ({ ...current, chordPro: value }))}
      />
      {errors.chordPro && <p className="ui-error">{errors.chordPro}</p>}
      {message && (
        <p className="ui-error" role="alert">
          {message}
        </p>
      )}

      <div className="ui-form__actions">
        <button className="ui-button ui-button--primary" type="submit" disabled={busy}>
          {busy ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar música'}
        </button>
        <Link className="ui-button ui-button--subtle" href={editando ? `/acervo/${song.id}` : '/acervo'}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
