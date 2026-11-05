'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmModal } from './ConfirmModal.jsx';
import { Icon } from './Icon.jsx';

/** @param {{celebrationId: string}} props */
export function DeleteCelebrationButton({ celebrationId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const excluir = async () => {
    setConfirming(false);
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/celebrations/${celebrationId}`, { method: 'DELETE' });
    setBusy(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'Não foi possível excluir o evento.');
      return;
    }
    router.push('/agenda');
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        className="ui-button ui-button--danger"
        title="Excluir evento"
        disabled={busy}
        onClick={() => setConfirming(true)}
      >
        <Icon name="delete" />
        <span className="ui-button__label">{busy ? 'Excluindo…' : 'Excluir evento'}</span>
      </button>
      {error && (
        <p className="ui-error" role="alert">
          {error}
        </p>
      )}
      {confirming && (
        <ConfirmModal
          title="Excluir este evento?"
          confirmLabel="Excluir evento"
          onConfirm={excluir}
          onCancel={() => setConfirming(false)}
        >
          O evento e todo o roteiro serão apagados. Essa ação não pode ser desfeita.
        </ConfirmModal>
      )}
    </>
  );
}
