'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LITURGICAL_SEASONS, seasonForDate, seasonLabel } from '@/domain/liturgy/seasons.js';
import { celebrationTypeLabel } from '@/domain/calendar/grid.js';
import { Select } from './Select.jsx';

const TIPOS = ['MISSA_COMUM', 'MISSA_SOLENE', 'ENSAIO'];

/**
 * Cadastro e edição de evento. O tempo litúrgico já vem sugerido pela
 * data escolhida — o coordenador só mexe quando o evento pede outro.
 *
 * @param {{celebration?: object, capelas?: {id: string, name: string}[], participantOptions?: {id: string, name: string, capelaName: string|null, ownCapela: boolean}[]}} props
 */
export function CelebrationForm({ celebration = null, capelas = [], participantOptions = [] }) {
  const router = useRouter();
  const editando = Boolean(celebration);

  const [form, setForm] = useState({
    title: celebration?.title ?? '',
    // <input type="datetime-local"> trabalha com o formato AAAA-MM-DDTHH:MM.
    date: celebration ? new Date(celebration.date).toISOString().slice(0, 16) : '',
    type: celebration?.type ?? 'MISSA_COMUM',
    season: celebration?.season ?? '',
    location: celebration?.location ?? '',
    notes: celebration?.notes ?? '',
    capelaId: celebration?.capelaId ?? capelas[0]?.id ?? '',
    participantIds: celebration?.participants?.map((p) => p.id) ?? [],
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const toggleParticipant = (id) =>
    setForm((current) => ({
      ...current,
      participantIds: current.participantIds.includes(id)
        ? current.participantIds.filter((item) => item !== id)
        : [...current.participantIds, id],
    }));

  const sugestao = form.date ? seasonForDate(`${form.date}:00.000Z`) : null;

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);

    const payload = {
      title: form.title,
      // O horário digitado é o da evento; guardamos exatamente ele.
      date: `${form.date}:00.000Z`,
      type: form.type,
      season: form.season || undefined,
      location: form.location || null,
      notes: form.notes || null,
      capelaId: form.capelaId || undefined,
      participantIds: form.participantIds,
    };

    const response = await fetch(
      editando ? `/api/celebrations/${celebration.id}` : '/api/celebrations',
      {
        method: editando ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    const body = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setErrors(body.details ?? {});
      setMessage(body.error ?? 'Não foi possível salvar.');
      return;
    }

    router.push(`/celebracoes/${body.celebration.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="ui-form" noValidate>
      <section className="ui-form__section">
        <h2 className="ui-heading-small">Dados do evento</h2>
        <div className="ui-stack">
          {!editando && capelas.length > 1 ? (
            <Select
              label="Capela"
              value={form.capelaId}
              options={capelas.map((capela) => ({ value: capela.id, label: capela.name }))}
              onChange={(capelaId) => setForm({ ...form, capelaId })}
            />
          ) : (
            (editando || capelas.length > 0) && (
              <label className="ui-field">
                <span>Capela{editando ? ' (não muda depois de criada)' : ''}</span>
                <input
                  value={
                    editando
                      ? (celebration.capela?.name ?? '')
                      : (capelas.find((capela) => capela.id === form.capelaId)?.name ?? capelas[0]?.name ?? '')
                  }
                  disabled
                />
              </label>
            )
          )}

          <label className="ui-field">
            <span>
              Título <em aria-hidden="true">*</em>
            </span>
            <input
              required
              value={form.title}
              onChange={update('title')}
              aria-invalid={Boolean(errors.title)}
              placeholder="Missa dominical, Casamento Ana e Pedro, Ensaio geral…"
            />
            {errors.title && <p className="ui-error">{errors.title}</p>}
          </label>

          <div className="grid-2">
            <label className="ui-field">
              <span>
                Data e horário <em aria-hidden="true">*</em>
              </span>
              <input
                type="datetime-local"
                required
                value={form.date}
                onChange={update('date')}
                aria-invalid={Boolean(errors.date)}
              />
              {errors.date && <p className="ui-error">{errors.date}</p>}
            </label>

            <Select
              label="Tipo"
              value={form.type}
              options={TIPOS.map((tipo) => ({ value: tipo, label: celebrationTypeLabel(tipo) }))}
              onChange={(type) => setForm({ ...form, type })}
            />

            <Select
              label="Tempo litúrgico"
              value={form.season}
              options={[
                {
                  value: '',
                  label: sugestao ? `Automático pela data (${seasonLabel(sugestao)})` : 'Automático pela data',
                },
                ...LITURGICAL_SEASONS.map((season) => ({ value: season.id, label: season.label })),
              ]}
              onChange={(season) => setForm({ ...form, season })}
            />

            <label className="ui-field">
              <span>Local</span>
              <input value={form.location} onChange={update('location')} placeholder="Igreja Matriz" />
            </label>
          </div>

          <label className="ui-field">
            <span>Observações</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={update('notes')}
              placeholder="Quem acompanha, ensaio prévio, pedidos da família…"
            />
          </label>
        </div>
      </section>

      {participantOptions.length > 0 && (
        <section className="ui-form__section">
          <h2 className="ui-heading-small">Participantes</h2>
          <p className="ui-helper">Opcional. Quem é das suas capelas aparece primeiro.</p>
          <div className="ui-checkbox-grid ui-checkbox-grid--wide">
            {participantOptions.map((participant) => (
              <label key={participant.id} className="ui-checkbox">
                <input
                  type="checkbox"
                  checked={form.participantIds.includes(participant.id)}
                  onChange={() => toggleParticipant(participant.id)}
                />
                <span>
                  {participant.name}
                  {!participant.ownCapela && participant.capelaName && <small>{participant.capelaName}</small>}
                </span>
              </label>
            ))}
          </div>
        </section>
      )}

      {message && (
        <p className="ui-error" role="alert">
          {message}
        </p>
      )}

      <div className="ui-form__actions">
        <button className="ui-button ui-button--primary" type="submit" disabled={busy}>
          {busy ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar evento'}
        </button>
        <Link className="ui-button ui-button--subtle" href={editando ? `/celebracoes/${celebration.id}` : '/agenda'}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
