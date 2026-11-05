'use client';

/**
 * Missa de sábado: segue a liturgia do sábado ou já a de domingo. Sem escolha
 * gravada, vale o horário (das 17h em diante, domingo).
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const OPCOES = [
  { value: 'SABADO', label: 'Liturgia de sábado' },
  { value: 'DOMINGO', label: 'Liturgia de domingo' },
];

/** @param {{celebrationId: string, choice: 'SABADO'|'DOMINGO', automatic: boolean, canEdit: boolean}} props */
export function LiturgyChoicePicker({ celebrationId, choice, automatic, canEdit }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const escolher = async (value) => {
    if (value === choice && !automatic) return;
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/celebrations/${celebrationId}/liturgy`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ choice: value }),
    });
    setBusy(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'Não foi possível trocar a liturgia.');
      return;
    }
    router.refresh();
  };

  const atual = OPCOES.find((option) => option.value === choice);

  if (!canEdit) {
    return <p className="ui-helper">Esta missa de sábado segue a {atual.label.toLowerCase()}.</p>;
  }

  return (
    <>
      <div className="ui-tabs ui-liturgy__tabs" role="group" aria-label="Liturgia da missa de sábado">
        {OPCOES.map((option) => (
          <button
            key={option.value}
            type="button"
            className="ui-tab"
            aria-current={option.value === choice ? 'true' : undefined}
            disabled={busy}
            onClick={() => escolher(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {automatic && <p className="ui-helper">Definida pelo horário da missa: a partir das 17h, domingo.</p>}
      {error && (
        <p className="ui-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
