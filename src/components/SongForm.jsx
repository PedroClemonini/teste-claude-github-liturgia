'use client';

/**
 * Cadastro de música com tela dividida: à esquerda o texto ChordPro, à direita
 * a cifra renderizada em tempo real.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChordProEditor } from './ChordProEditor.jsx';
import { LITURGICAL_MOMENTS } from '@/domain/liturgy/moments.js';
import { LITURGICAL_SEASONS } from '@/domain/liturgy/seasons.js';
import { extractKey } from '@/domain/chordpro/parse.js';

/** @param {{song?: object}} props */
export function SongForm({ song = null }) {
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
    <form onSubmit={submit} noValidate>
      {!editando && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <label className="field">
            <span>Importar do CifraClub (opcional)</span>
            <div className="row">
              <input
                type="url"
                value={importUrl}
                onChange={(event) => setImportUrl(event.target.value)}
                placeholder="https://www.cifraclub.com.br/..."
                style={{ flex: 1 }}
              />
              <button className="btn" type="button" onClick={importFromCifraClub} disabled={importing || !importUrl}>
                {importing ? 'Importando…' : 'Importar'}
              </button>
            </div>
          </label>
          {importError && <p className="error">{importError}</p>}
          <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)' }}>
            Preenche o título, o tom e a cifra abaixo a partir da página — revise antes de salvar.
          </p>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="grid-2">
          <label className="field">
            <span>Título</span>
            <input required value={form.title} onChange={update('title')} />
            {errors.title && <p className="error">{errors.title}</p>}
          </label>

          <label className="field">
            <span>Autor ou fonte (opcional)</span>
            <input value={form.composer} onChange={update('composer')} placeholder="Pe. Zezinho, CD da Campanha…" />
          </label>
        </div>

        <label className="field" style={{ maxWidth: '12rem' }}>
          <span>Tom original</span>
          <input
            value={form.originalKey}
            onChange={update('originalKey')}
            placeholder={detectado ? `${detectado} (detectado)` : 'G'}
          />
          {errors.originalKey && <p className="error">{errors.originalKey}</p>}
        </label>

        <label className="field">
          <span>Link para ouvir (opcional)</span>
          <input
            type="url"
            value={form.audioUrl}
            onChange={update('audioUrl')}
            placeholder="https://youtube.com/..."
          />
          {errors.audioUrl && <p className="error">{errors.audioUrl}</p>}
        </label>

        <fieldset style={{ border: 0, padding: 0, margin: '0 0 0.8rem' }}>
          <legend style={{ fontSize: '0.85rem', fontWeight: 600, padding: 0 }}>
            Momentos do rito em que serve
          </legend>
          <div className="row">
            {LITURGICAL_MOMENTS.map((moment) => (
              <label key={moment.id} className="tag tag--choice" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ width: '1.1rem', height: '1.1rem', minHeight: 0, marginRight: '0.4rem' }}
                  checked={form.moments.includes(moment.id)}
                  onChange={() => toggle('moments', moment.id)}
                />
                {moment.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset style={{ border: 0, padding: 0 }}>
          <legend style={{ fontSize: '0.85rem', fontWeight: 600, padding: 0 }}>
            Tempos litúrgicos (em branco = serve em qualquer tempo)
          </legend>
          <div className="row">
            {LITURGICAL_SEASONS.map((season) => (
              <label key={season.id} className="tag tag--choice" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ width: '1.1rem', height: '1.1rem', minHeight: 0, marginRight: '0.4rem' }}
                  checked={form.seasons.includes(season.id)}
                  onChange={() => toggle('seasons', season.id)}
                />
                {season.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <ChordProEditor
        value={form.chordPro}
        onChange={(value) => setForm((current) => ({ ...current, chordPro: value }))}
      />
      {errors.chordPro && <p className="error">{errors.chordPro}</p>}
      {message && <p className="error">{message}</p>}

      <div className="row" style={{ marginTop: '1rem' }}>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar música'}
        </button>
      </div>
    </form>
  );
}
