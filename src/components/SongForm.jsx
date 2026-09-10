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
    moments: song?.moments ?? [],
    seasons: song?.seasons ?? [],
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

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

        <fieldset style={{ border: 0, padding: 0, margin: '0 0 0.8rem' }}>
          <legend style={{ fontSize: '0.85rem', fontWeight: 600, padding: 0 }}>
            Momentos do rito em que serve
          </legend>
          <div className="row">
            {LITURGICAL_MOMENTS.map((moment) => (
              <label key={moment.id} className="tag" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto', minHeight: 0, marginRight: '0.3rem' }}
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
              <label key={season.id} className="tag" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto', minHeight: 0, marginRight: '0.3rem' }}
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
