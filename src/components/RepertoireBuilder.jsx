'use client';

/**
 * Montagem do roteiro musical: uma linha por momento do rito, com a música
 * escolhida do acervo e o tom em que ela será executada nesta celebração.
 */
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LITURGICAL_MOMENTS } from '@/domain/liturgy/moments.js';

/**
 * @param {{
 *   celebrationId: string,
 *   songs: Array<{id: string, title: string, originalKey: string, moments: string[]}>,
 *   initial: Array<{moment: string, songId: string, keyOverride: string|null, position: number}>,
 * }} props
 */
export function RepertoireBuilder({ celebrationId, songs, initial }) {
  const router = useRouter();

  // Uma linha por momento (posição 0), que é o caso comum; posições extras
  // criadas em outro lugar continuam salvas até serem alteradas aqui.
  const [rows, setRows] = useState(() => {
    const base = {};
    for (const moment of LITURGICAL_MOMENTS) {
      base[moment.id] = { songId: '', keyOverride: '' };
    }
    for (const item of initial) {
      if (item.position !== 0) continue;
      base[item.moment] = { songId: item.songId, keyOverride: item.keyOverride ?? '' };
    }
    return base;
  });
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const songById = useMemo(() => new Map(songs.map((song) => [song.id, song])), [songs]);

  const escolhidos = Object.values(rows).filter((row) => row.songId).length;

  const update = (moment, patch) =>
    setRows((current) => ({ ...current, [moment]: { ...current[moment], ...patch } }));

  const salvar = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);

    const items = Object.entries(rows)
      .filter(([, row]) => row.songId)
      .map(([moment, row]) => ({
        moment,
        songId: row.songId,
        position: 0,
        keyOverride: row.keyOverride || null,
      }));

    const response = await fetch(`/api/celebrations/${celebrationId}/repertoire`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setError(body.error ?? 'Não foi possível salvar o roteiro.');
      return;
    }
    setMessage('Roteiro salvo.');
    router.refresh();
  };

  return (
    <div className="card">
      <p style={{ marginTop: 0, color: 'var(--text-soft)', fontSize: '0.88rem' }}>
        Escolha a música de cada momento. Deixe em branco os momentos que não terão canto.
        O tom em branco usa o tom original da cifra.
      </p>

      {LITURGICAL_MOMENTS.map((moment) => {
        const row = rows[moment.id];
        const song = songById.get(row.songId);
        // Sugere primeiro as músicas marcadas para este momento do rito.
        const sugeridas = songs.filter((item) => item.moments?.includes(moment.id));
        const restantes = songs.filter((item) => !item.moments?.includes(moment.id));

        return (
          <div className="moment-row" key={moment.id}>
            <span className="moment-row-label">{moment.label}</span>

            <select
              aria-label={`Música para ${moment.label}`}
              value={row.songId}
              onChange={(event) => update(moment.id, { songId: event.target.value })}
            >
              <option value="">— sem canto —</option>
              {sugeridas.length > 0 && (
                <optgroup label={`Indicadas para ${moment.label}`}>
                  {sugeridas.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} ({item.originalKey})
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Demais músicas do acervo">
                {restantes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} ({item.originalKey})
                  </option>
                ))}
              </optgroup>
            </select>

            <input
              aria-label={`Tom para ${moment.label}`}
              placeholder={song ? song.originalKey : 'tom'}
              value={row.keyOverride}
              onChange={(event) => update(moment.id, { keyOverride: event.target.value })}
              disabled={!row.songId}
            />
          </div>
        );
      })}

      {error && <p className="error">{error}</p>}
      {message && (
        <p style={{ color: 'var(--ok)', fontSize: '0.9rem' }} role="status">
          {message}
        </p>
      )}

      <div className="row" style={{ marginTop: '1rem' }}>
        <button className="btn" type="button" onClick={salvar} disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar roteiro'}
        </button>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-soft)' }}>
          {escolhidos} {escolhidos === 1 ? 'canto escolhido' : 'cantos escolhidos'}
        </span>
      </div>
    </div>
  );
}
