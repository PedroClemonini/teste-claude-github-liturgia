'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LITURGICAL_SEASONS, seasonForDate } from '@/domain/liturgy/seasons.js';
import { celebrationTypeLabel } from '@/domain/calendar/grid.js';

const TIPOS = ['MISSA_COMUM', 'MISSA_SOLENE', 'ENSAIO'];

/**
 * Cadastro e edição de celebração. O tempo litúrgico já vem sugerido pela
 * data escolhida — o coordenador só mexe quando a celebração pede outro.
 *
 * @param {{celebration?: object}} props
 */
export function CelebrationForm({ celebration = null }) {
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
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const sugestao = form.date ? seasonForDate(`${form.date}:00.000Z`) : null;

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);

    const payload = {
      title: form.title,
      // O horário digitado é o da celebração; guardamos exatamente ele.
      date: `${form.date}:00.000Z`,
      type: form.type,
      season: form.season || undefined,
      location: form.location || null,
      notes: form.notes || null,
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
    <form onSubmit={submit} className="card" noValidate>
      <label className="field">
        <span>Título</span>
        <input
          required
          value={form.title}
          onChange={update('title')}
          placeholder="Missa dominical, Casamento Ana e Pedro, Ensaio geral…"
        />
        {errors.title && <p className="error">{errors.title}</p>}
      </label>

      <div className="grid-2">
        <label className="field">
          <span>Data e horário</span>
          <input type="datetime-local" required value={form.date} onChange={update('date')} />
          {errors.date && <p className="error">{errors.date}</p>}
        </label>

        <label className="field">
          <span>Tipo</span>
          <select value={form.type} onChange={update('type')}>
            {TIPOS.map((tipo) => (
              <option key={tipo} value={tipo}>
                {celebrationTypeLabel(tipo)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid-2">
        <label className="field">
          <span>Tempo litúrgico</span>
          <select value={form.season} onChange={update('season')}>
            <option value="">
              {sugestao ? `Automático pela data (${sugestao})` : 'Automático pela data'}
            </option>
            {LITURGICAL_SEASONS.map((season) => (
              <option key={season.id} value={season.id}>
                {season.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Local (opcional)</span>
          <input value={form.location} onChange={update('location')} placeholder="Igreja Matriz" />
        </label>
      </div>

      <label className="field">
        <span>Observações (opcional)</span>
        <textarea
          rows={3}
          value={form.notes}
          onChange={update('notes')}
          placeholder="Quem acompanha, ensaio prévio, pedidos da família…"
        />
      </label>

      {message && <p className="error">{message}</p>}

      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar celebração'}
      </button>
    </form>
  );
}
