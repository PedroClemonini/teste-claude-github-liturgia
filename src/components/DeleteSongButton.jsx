'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** @param {{songId: string, title: string}} props */
export function DeleteSongButton({ songId, title }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const excluir = async () => {
    if (!window.confirm(`Remover "${title}" do acervo? Essa ação não pode ser desfeita.`)) {
      return;
    }
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/songs/${songId}`, { method: 'DELETE' });
    setBusy(false);

    if (!response.ok) {
      // 409: a música ainda está no roteiro de algum evento — o servidor explica.
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'Não foi possível remover a música.');
      return;
    }
    router.push('/acervo');
    router.refresh();
  };

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <button type="button" className="btn btn--danger" disabled={busy} onClick={excluir}>
        {busy ? 'Removendo…' : 'Remover do acervo'}
      </button>
      {error && <p className="error">{error}</p>}
    </span>
  );
}
