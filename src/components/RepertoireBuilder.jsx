'use client';

/**
 * Montagem do roteiro musical: uma linha por momento do rito, com a música
 * escolhida do acervo e o tom em que ela será executada nesta evento.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LITURGICAL_MOMENTS } from '@/domain/liturgy/moments.js';
import { Select } from './Select.jsx';

/** Sem canto primeiro; depois as indicadas para o momento e o resto do acervo. */
function songOptions(songs, moment) {
  const toOption = (group) => (song) => ({
    value: song.id,
    label: `${song.title} (${song.originalKey})`,
    group,
    keywords: (song.tags ?? []).join(' '),
  });
  return [
    { value: '', label: 'Sem canto' },
    ...songs.filter((song) => song.moments?.includes(moment.id)).map(toOption(`Indicadas para ${moment.label}`)),
    ...songs.filter((song) => !song.moments?.includes(moment.id)).map(toOption('Demais músicas do acervo')),
  ];
}

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
    <div className="ui-form">
      <p className="ui-subtle ui-repertoire__hint">
        Escolha a música de cada momento. Deixe sem canto os momentos que não terão música. Tom em
        branco usa o tom original da cifra.
      </p>

      <div className="moment-head" aria-hidden="true">
        <span>Momento</span>
        <span>Música</span>
        <span>Tom</span>
      </div>

      {LITURGICAL_MOMENTS.map((moment) => {
        const row = rows[moment.id];
        const song = songById.get(row.songId);

        return (
          <div className="moment-row" key={moment.id}>
            <span className="moment-row-label">{moment.label}</span>

            <Select
              compact
              searchable
              label={`Música para ${moment.label}`}
              value={row.songId}
              options={songOptions(songs, moment)}
              onChange={(songId) => update(moment.id, { songId, keyOverride: songId ? row.keyOverride : '' })}
            />

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

      {error && (
        <p className="ui-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="ui-success" role="status">
          {message}
        </p>
      )}

      <div className="ui-form__actions ui-repertoire__actions">
        <button className="ui-button ui-button--primary" type="button" onClick={salvar} disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar roteiro'}
        </button>
        <Link className="ui-button ui-button--subtle" href={`/celebracoes/${celebrationId}`}>
          Voltar ao evento
        </Link>
        <span className="ui-subtle">
          {escolhidos} {escolhidos === 1 ? 'canto escolhido' : 'cantos escolhidos'}
        </span>
      </div>
    </div>
  );
}
