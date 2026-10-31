'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** @param {{celebrationId: string}} props */
export function DeleteCelebrationButton({ celebrationId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const excluir = async () => {
    if (!window.confirm('Excluir esta evento e todo o roteiro? Essa ação não pode ser desfeita.')) {
      return;
    }
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/celebrations/${celebrationId}`, { method: 'DELETE' });
    setBusy(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'Não foi possível excluir a evento.');
      return;
    }
    router.push('/agenda');
    router.refresh();
  };

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <button type="button" className="btn btn--danger" disabled={busy} onClick={excluir}>
        {busy ? 'Excluindo…' : 'Excluir evento'}
      </button>
      {error && <p className="error">{error}</p>}
    </span>
  );
}
